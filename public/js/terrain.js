/**
 * TERRAIN ALTIMETER MAP VISUALIZATION
 *
 * This script creates an animated generative terrain visualization with topographic
 * contour lines using WebGL shaders. The terrain slowly morphs over time, creating
 * an organic, evolving landscape visualization.
 *
 * Features:
 * - Three terrain generation modes: mountains, rolling hills, and abstract noise
 * - Sparse contour lines for traditional topographic map aesthetic
 * - Smooth animation with terrain morphing
 * - Optional debug UI (dat.GUI) with query parameter ?debug
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Terrain generation parameters
   * These can be adjusted via dat.GUI when ?debug query parameter is present
   */
  const config = {
    // Terrain mode: 'mountains', 'hills', or 'abstract'
    terrainMode: 'abstract',

    // Contour line spacing (higher = more space between lines)
    contourSpacing: 0.05,

    // Animation speed multiplier
    animationSpeed: 1.0,

    // Terrain scale (higher = more zoomed out view)
    terrainScale: 0.5,

    // Line thickness (in screen-space units, affects anti-aliasing)
    lineThickness: 0.001
  };

  // ============================================================================
  // WEBGL INITIALIZATION
  // ============================================================================

  const canvas = document.getElementById('terrain-shader');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    console.error('WebGL not supported');
    return;
  }

  // Enable derivative functions extension (required for dFdx/dFdy)
  // This extension is widely supported and allows us to calculate gradients
  const derivativesExt = gl.getExtension('OES_standard_derivatives');
  if (!derivativesExt) {
    console.error('OES_standard_derivatives extension not supported');
    return;
  }

  // ============================================================================
  // VERTEX SHADER
  // ============================================================================

  /**
   * Simple vertex shader that creates a full-screen quad
   * Passes through position coordinates for fragment shader processing
   */
  const vertexShaderSource = `
    attribute vec2 position;

    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // ============================================================================
  // FRAGMENT SHADER - TERRAIN GENERATION & RENDERING
  // ============================================================================

  const fragmentShaderSource = `
    #extension GL_OES_standard_derivatives : enable

    precision highp float;

    // Uniforms passed from JavaScript
    uniform float time;
    uniform vec2 resolution;
    uniform float terrainMode;        // 0.0 = mountains, 1.0 = hills, 2.0 = abstract
    uniform float contourSpacing;
    uniform float terrainScale;
    uniform float lineThickness;

    // ========================================================================
    // NOISE GENERATION FUNCTIONS
    // ========================================================================

    /**
     * Hash function - generates pseudo-random values from 2D coordinates
     *
     * @param p - 2D position vector
     * @return float - pseudo-random value between 0 and 1
     *
     * How it works:
     * 1. Takes dot product of input with magic numbers (127.1, 311.7)
     * 2. Takes sine to create wave-like pattern
     * 3. Multiplies by large number and takes fractional part for randomness
     */
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    /**
     * 2D Perlin-style noise function
     *
     * @param p - 2D position to sample noise at
     * @return float - smoothly interpolated noise value between 0 and 1
     *
     * How it works:
     * 1. Splits position into integer grid cell (i) and fractional position (f)
     * 2. Gets random values at four corners of the grid cell
     * 3. Applies smoothstep curve to fractional position for smooth interpolation
     * 4. Bilinearly interpolates between the four corner values
     */
    float noise(vec2 p) {
      vec2 i = floor(p);           // Grid cell coordinates
      vec2 f = fract(p);           // Position within cell (0 to 1)

      // Smooth interpolation curve (hermite)
      f = f * f * (3.0 - 2.0 * f);

      // Get random values at four corners of grid cell
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      // Bilinear interpolation
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    /**
     * Fractional Brownian Motion (fBm) - layered noise for natural terrain
     *
     * @param p - 2D position to sample
     * @param octaves - number of noise layers to combine
     * @return float - combined noise value
     *
     * How it works:
     * Combines multiple octaves of noise at different frequencies and amplitudes.
     * Each octave adds finer detail:
     * - Frequency doubles each octave (2x smaller features)
     * - Amplitude halves each octave (2x less influence)
     * This creates natural-looking fractal patterns like real terrain
     */
    float fbm(vec2 p, int octaves) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;

      for(int i = 0; i < 8; i++) {
        if (i >= octaves) break;

        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;      // Each octave contributes half as much
        frequency *= 2.0;      // Each octave is twice as detailed
      }

      return value;
    }

    // ========================================================================
    // TERRAIN GENERATION FUNCTIONS
    // ========================================================================

    /**
     * Mountain terrain generator - creates dramatic peaks and valleys
     *
     * @param p - 2D position on terrain
     * @param t - time for animation
     * @return float - elevation value
     *
     * How it works:
     * - Uses high-frequency noise (6 octaves) for detailed features
     * - Applies power function to create sharp peaks
     * - Adds ridged noise (abs + inversion) for mountain ridges
     * - Animates by offsetting noise lookup position over time
     */
    float generateMountains(vec2 p, float t) {
      // Animate by slowly moving through noise space
      vec2 offset = vec2(t * 0.02, t * 0.015);
      vec2 pos = p + offset;

      // Base terrain with multiple octaves for detail
      float elevation = fbm(pos, 6);

      // Create sharp peaks by applying power function
      elevation = pow(elevation, 1.5);

      // Add ridged noise for mountain ridges
      // abs() creates sharp creases, inversion creates ridges
      float ridges = 1.0 - abs(noise(pos * 2.0) * 2.0 - 1.0);
      ridges = pow(ridges, 3.0);

      // Combine base terrain with ridges
      elevation = elevation * 0.7 + ridges * 0.3;

      return elevation;
    }

    /**
     * Rolling hills terrain generator - creates smooth, gentle landscapes
     *
     * @param p - 2D position on terrain
     * @param t - time for animation
     * @return float - elevation value
     *
     * How it works:
     * - Uses fewer octaves (4) for smoother features
     * - Applies smoothstep for very gentle transitions
     * - Multiple noise layers at different scales for natural variation
     * - Very slow animation for peaceful feel
     */
    float generateHills(vec2 p, float t) {
      // Very slow animation for gentle movement
      vec2 offset = vec2(t * 0.01, t * 0.008);
      vec2 pos = p + offset;

      // Smooth, low-frequency noise (fewer octaves = smoother)
      float elevation = fbm(pos * 0.8, 4);

      // Apply smoothstep for extra smooth transitions
      elevation = smoothstep(0.2, 0.8, elevation);

      // Add subtle large-scale variation
      float largeFeatures = noise(pos * 0.3) * 0.3;
      elevation = elevation * 0.7 + largeFeatures;

      return elevation;
    }

    /**
     * Abstract noise terrain generator - pure computer-generated patterns
     *
     * @param p - 2D position
     * @param t - time for animation
     * @return float - elevation value
     *
     * How it works:
     * - Combines multiple noise layers at different scales and speeds
     * - Each layer moves in different direction for complex animation
     * - Creates abstract, organic patterns that don't resemble real terrain
     * - More dynamic animation than other modes
     */
    float generateAbstract(vec2 p, float t) {
      // Multiple layers moving in different directions
      vec2 offset1 = vec2(t * 0.03, -t * 0.025);
      vec2 offset2 = vec2(-t * 0.02, t * 0.035);
      vec2 offset3 = vec2(t * 0.015, t * 0.02);

      // Three layers at different scales
      float layer1 = fbm(p * 1.5 + offset1, 5) * 0.4;
      float layer2 = fbm(p * 3.0 + offset2, 4) * 0.3;
      float layer3 = fbm(p * 0.8 + offset3, 3) * 0.3;

      // Combine layers
      float elevation = layer1 + layer2 + layer3;

      // Normalize to 0-1 range
      elevation = fract(elevation);

      return elevation;
    }

    /**
     * Master terrain elevation function - routes to appropriate generator
     *
     * @param p - 2D position
     * @param t - time
     * @return float - elevation at position
     *
     * Uses terrainMode uniform to select which generator to use.
     * This allows switching between terrain types in real-time.
     */
    float getElevation(vec2 p, float t) {
      if (terrainMode < 0.5) {
        return generateMountains(p, t);
      } else if (terrainMode < 1.5) {
        return generateHills(p, t);
      } else {
        return generateAbstract(p, t);
      }
    }

    // ========================================================================
    // CONTOUR LINE RENDERING
    // ========================================================================

    /**
     * Contour line renderer with gradient-adaptive thickness
     *
     * @param elevation - height value at current pixel
     * @param elevationGradient - rate of elevation change (from derivatives)
     * @param spacing - distance between contour lines
     * @param thickness - base line thickness in screen space
     * @return float - line intensity (0 = black, 1 = white line)
     *
     * How it works:
     * 1. Takes modulo of elevation to create repeating intervals
     * 2. Calculates distance to nearest contour line
     * 3. Uses elevation gradient to adapt line thickness:
     *    - Steep terrain (high gradient) = elevation changes quickly = thicker in elevation-space
     *    - Flat terrain (low gradient) = elevation changes slowly = thinner in elevation-space
     * 4. This ensures lines appear consistent width on screen regardless of terrain steepness
     * 5. Applies smoothstep for anti-aliased edges (no jagged pixels)
     *
     * The gradient adaptation is crucial for consistent line appearance:
     * - Without it, lines on steep slopes become thin/gapped
     * - Without it, lines on flat areas become thick/blurry
     */
    float renderContour(float elevation, float elevationGradient, float spacing, float thickness) {
      // Get position within contour interval (0 to spacing)
      float contourValue = mod(elevation, spacing);

      // Distance from nearest contour line (0 at line, 0.5*spacing at midpoint between lines)
      float distanceToLine = abs(contourValue - spacing * 0.5);

      // Adapt line thickness based on terrain gradient
      // Higher gradient (steeper terrain) = need thicker lines in elevation-space
      // to maintain consistent screen-space appearance
      // Add small epsilon to prevent division by zero on perfectly flat terrain
      float adaptiveThickness = thickness * max(elevationGradient, 0.01);

      // Create line with anti-aliasing
      // smoothstep creates smooth falloff at edges for crisp rendering
      float lineIntensity = 1.0 - smoothstep(adaptiveThickness * 0.5, adaptiveThickness * 1.5, distanceToLine);

      return lineIntensity;
    }

    // ========================================================================
    // MAIN FRAGMENT SHADER
    // ========================================================================

    void main() {
      // Normalize coordinates to 0-1 range
      vec2 uv = gl_FragCoord.xy / resolution;

      // Center the coordinates (-0.5 to 0.5 range)
      // This makes the terrain scale from the center of the screen
      uv = uv - 0.5;

      // Adjust for aspect ratio to prevent stretching
      // This ensures terrain looks the same on wide vs. tall screens
      vec2 aspectRatio = vec2(resolution.x / resolution.y, 1.0);
      uv = uv * aspectRatio;

      // Apply terrain scale (zoom level)
      // Because we centered the coordinates, scaling now happens from screen center
      vec2 terrainPos = uv * terrainScale;

      // Get elevation at this pixel
      float elevation = getElevation(terrainPos, time);

      // Calculate elevation gradient using screen-space derivatives
      // This measures how quickly elevation changes across the screen
      // dFdx/dFdy are GLSL built-ins that compute partial derivatives
      // Higher gradient = steeper terrain
      float dEdx = dFdx(elevation);
      float dEdy = dFdy(elevation);
      float elevationGradient = length(vec2(dEdx, dEdy));

      // Render contour lines with gradient-adaptive thickness
      float contourLine = renderContour(elevation, elevationGradient, contourSpacing, lineThickness);

      // Final color: black background with white contour lines
      vec3 backgroundColor = vec3(0.0, 0.0, 0.0);  // Pure black
      vec3 lineColor = vec3(1.0, 1.0, 1.0);         // Pure white

      // Mix between background and line color based on line intensity
      vec3 finalColor = mix(backgroundColor, lineColor, contourLine);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // ============================================================================
  // SHADER COMPILATION
  // ============================================================================

  /**
   * Compiles a GLSL shader from source code
   *
   * @param gl - WebGL context
   * @param type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
   * @param source - GLSL source code string
   * @return WebGLShader - Compiled shader object, or null on error
   */
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Links vertex and fragment shaders into a complete WebGL program
   *
   * @param gl - WebGL context
   * @param vertexShader - Compiled vertex shader
   * @param fragmentShader - Compiled fragment shader
   * @return WebGLProgram - Linked program, or null on error
   */
  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  // Compile shaders and create program
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  // ============================================================================
  // GEOMETRY SETUP
  // ============================================================================

  /**
   * Full-screen quad geometry
   * Two triangles covering the entire viewport (-1 to 1 in clip space)
   *
   * Triangle strip order:
   * (-1,1)  (1,1)
   *   3------4
   *   |    / |
   *   |  /   |
   *   |/     |
   *   1------2
   * (-1,-1) (1,-1)
   */
  const positions = new Float32Array([
    -1, -1,  // Bottom-left
     1, -1,  // Bottom-right
    -1,  1,  // Top-left
     1,  1,  // Top-right
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  // ============================================================================
  // UNIFORM AND ATTRIBUTE LOCATIONS
  // ============================================================================

  // Get attribute and uniform locations from shader program
  const positionLocation = gl.getAttribLocation(program, 'position');
  const timeLocation = gl.getUniformLocation(program, 'time');
  const resolutionLocation = gl.getUniformLocation(program, 'resolution');
  const terrainModeLocation = gl.getUniformLocation(program, 'terrainMode');
  const contourSpacingLocation = gl.getUniformLocation(program, 'contourSpacing');
  const terrainScaleLocation = gl.getUniformLocation(program, 'terrainScale');
  const lineThicknessLocation = gl.getUniformLocation(program, 'lineThickness');

  // ============================================================================
  // CANVAS RESIZE HANDLING
  // ============================================================================

  /**
   * Resizes canvas to fill window and updates WebGL viewport
   * Called on window resize and initial setup
   */
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();

  // ============================================================================
  // DEBUG UI (dat.GUI)
  // ============================================================================

  /**
   * Initializes dat.GUI debug interface
   * Only loads when ?debug query parameter is present in URL
   *
   * Provides real-time controls for:
   * - Terrain mode selection
   * - Contour spacing
   * - Animation speed
   * - Terrain scale
   * - Line thickness
   */
  function initDebugUI() {
    // Check for ?debug query parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('debug')) {
      return;
    }

    // Lazy load dat.GUI from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js';
    script.onload = function() {
      const gui = new dat.GUI();

      // Terrain mode selector
      const terrainModes = {
        'Mountains': 'mountains',
        'Rolling Hills': 'hills',
        'Abstract': 'abstract'
      };

      gui.add(config, 'terrainMode', terrainModes).name('Terrain Mode');

      // Contour line spacing
      gui.add(config, 'contourSpacing', 0.05, 0.5).name('Contour Spacing');

      // Animation speed
      gui.add(config, 'animationSpeed', 0.0, 3.0).name('Animation Speed');

      // Terrain scale (zoom)
      gui.add(config, 'terrainScale', 0.5, 10.0).name('Terrain Scale');

      // Line thickness
      gui.add(config, 'lineThickness', 0.001, 0.2).name('Line Thickness');

      console.log('Debug UI loaded. Controls available in top-right corner.');
    };

    document.head.appendChild(script);
  }

  // Initialize debug UI if ?debug parameter is present
  initDebugUI();

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  /**
   * Start time with random offset
   * This ensures each page load shows a different section of the animation
   */
  const startTime = Date.now() - Math.random() * 100000;

  /**
   * Main render loop - called every frame
   *
   * Flow:
   * 1. Calculate current time
   * 2. Set shader program and uniforms
   * 3. Bind geometry
   * 4. Draw full-screen quad
   * 5. Request next frame
   */
  function render() {
    // Calculate elapsed time with animation speed multiplier
    const time = (Date.now() - startTime) * 0.001 * config.animationSpeed;

    // Activate shader program
    gl.useProgram(program);

    // Set time uniform
    gl.uniform1f(timeLocation, time);

    // Set resolution uniform (for aspect ratio correction)
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    // Convert terrain mode string to number for shader
    const terrainModeValue =
      config.terrainMode === 'mountains' ? 0.0 :
      config.terrainMode === 'hills' ? 1.0 : 2.0;
    gl.uniform1f(terrainModeLocation, terrainModeValue);

    // Set other configuration uniforms
    gl.uniform1f(contourSpacingLocation, config.contourSpacing);
    gl.uniform1f(terrainScaleLocation, config.terrainScale);
    gl.uniform1f(lineThicknessLocation, config.lineThickness);

    // Set up position attribute
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Draw the full-screen quad (triangle strip with 4 vertices)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Request next animation frame
    requestAnimationFrame(render);
  }

  // Start the animation loop
  render();

})();
