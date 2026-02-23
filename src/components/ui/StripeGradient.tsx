import { useEffect, useRef } from 'react';

// Stripe WebGL Gradient Animation
// Based on https://stripe.com gradient effect

function normalizeColor(hexCode: number): number[] {
    return [
        ((hexCode >> 16) & 255) / 255,
        ((hexCode >> 8) & 255) / 255,
        (255 & hexCode) / 255
    ];
}

class MiniGl {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    meshes: any[];
    commonUniforms: any;
    lastDebugMsg: number;
    width: number;
    height: number;
    debug: (...args: any[]) => void;
    Material: any;
    Uniform: any;
    PlaneGeometry: any;
    Mesh: any;
    Attribute: any;

    constructor(canvas: HTMLCanvasElement, width?: number, height?: number, debug = false) {
        const _miniGl = this;
        const debug_output = -1 !== document.location.search.toLowerCase().indexOf("debug=webgl");

        _miniGl.canvas = canvas;
        _miniGl.gl = _miniGl.canvas.getContext("webgl", { antialias: true })!;
        _miniGl.meshes = [];
        _miniGl.width = 0;
        _miniGl.height = 0;
        _miniGl.lastDebugMsg = 0;

        const context = _miniGl.gl;

        _miniGl.debug = debug && debug_output
            ? function (e: string) {
                const t = new Date().getTime();
                if (t - _miniGl.lastDebugMsg > 1e3) console.log("---");
                console.log(new Date().toLocaleTimeString() + Array(Math.max(0, 32 - e.length)).join(" ") + e + ": ", ...Array.from(arguments).slice(1));
                _miniGl.lastDebugMsg = t;
            }
            : () => { };

        // Material class
        _miniGl.Material = class {
            uniforms: any;
            uniformInstances: any[];
            vertexSource: string;
            Source: string;
            vertexShader: WebGLShader;
            fragmentShader: WebGLShader;
            program: WebGLProgram;

            constructor(vertexShaders: string, fragments: string, uniforms: any = {}) {
                const material = this;

                function getShaderByType(type: number, source: string): WebGLShader {
                    const shader = context.createShader(type)!;
                    context.shaderSource(shader, source);
                    context.compileShader(shader);
                    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
                        console.error(context.getShaderInfoLog(shader));
                    }
                    return shader;
                }

                function getUniformVariableDeclarations(uniforms: any, type: string): string {
                    return Object.entries(uniforms)
                        .map(([uniform, value]: [string, any]) => value.getDeclaration(uniform, type))
                        .join("\n");
                }

                material.uniforms = uniforms;
                material.uniformInstances = [];

                const prefix = "\n              precision highp float;\n            ";

                material.vertexSource = `
          ${prefix}
          attribute vec4 position;
          attribute vec2 uv;
          attribute vec2 uvNorm;
          ${getUniformVariableDeclarations(_miniGl.commonUniforms, "vertex")}
          ${getUniformVariableDeclarations(uniforms, "vertex")}
          ${vertexShaders}
        `;

                material.Source = `
          ${prefix}
          ${getUniformVariableDeclarations(_miniGl.commonUniforms, "fragment")}
          ${getUniformVariableDeclarations(uniforms, "fragment")}
          ${fragments}
        `;

                material.vertexShader = getShaderByType(context.VERTEX_SHADER, material.vertexSource);
                material.fragmentShader = getShaderByType(context.FRAGMENT_SHADER, material.Source);
                material.program = context.createProgram()!;

                context.attachShader(material.program, material.vertexShader);
                context.attachShader(material.program, material.fragmentShader);
                context.linkProgram(material.program);

                if (!context.getProgramParameter(material.program, context.LINK_STATUS)) {
                    console.error(context.getProgramInfoLog(material.program));
                }

                context.useProgram(material.program);
                material.attachUniforms(undefined, _miniGl.commonUniforms);
                material.attachUniforms(undefined, material.uniforms);
            }

            attachUniforms(name: string | undefined, uniforms: any) {
                const material = this;
                if (name === undefined) {
                    Object.entries(uniforms).forEach(([name, uniform]) => {
                        material.attachUniforms(name, uniform);
                    });
                } else if (uniforms.type === "array") {
                    uniforms.value.forEach((uniform: any, i: number) =>
                        material.attachUniforms(`${name}[${i}]`, uniform)
                    );
                } else if (uniforms.type === "struct") {
                    Object.entries(uniforms.value).forEach(([uniform, i]) =>
                        material.attachUniforms(`${name}.${uniform}`, i)
                    );
                } else {
                    material.uniformInstances.push({
                        uniform: uniforms,
                        location: context.getUniformLocation(material.program, name)
                    });
                }
            }
        };

        // Uniform class
        _miniGl.Uniform = class {
            type: string;
            value: any;
            typeFn: string;
            transpose: boolean;
            excludeFrom?: string;

            constructor(e: any) {
                this.type = "float";
                this.transpose = false;
                Object.assign(this, e);
                this.typeFn = {
                    float: "1f",
                    int: "1i",
                    vec2: "2fv",
                    vec3: "3fv",
                    vec4: "4fv",
                    mat4: "Matrix4fv"
                }[this.type] || "1f";
                this.update();
            }

            update(value?: any) {
                if (this.value !== undefined) {
                    (context as any)[`uniform${this.typeFn}`](
                        value,
                        this.typeFn.indexOf("Matrix") === 0 ? this.transpose : this.value,
                        this.typeFn.indexOf("Matrix") === 0 ? this.value : null
                    );
                }
            }

            getDeclaration(name: string, type: string, length?: number): string {
                const uniform = this;
                if (uniform.excludeFrom === type) return "";

                if (uniform.type === "array") {
                    return uniform.value[0].getDeclaration(name, type, uniform.value.length) +
                        `\nconst int ${name}_length = ${uniform.value.length};`;
                }

                if (uniform.type === "struct") {
                    let name_no_prefix = name.replace("u_", "");
                    name_no_prefix = name_no_prefix.charAt(0).toUpperCase() + name_no_prefix.slice(1);
                    return `uniform struct ${name_no_prefix} \n{\n` +
                        Object.entries(uniform.value)
                            .map(([n, u]: [string, any]) => u.getDeclaration(n, type).replace(/^uniform/, ""))
                            .join("") +
                        `\n} ${name}${length && length > 0 ? `[${length}]` : ""};`;
                }

                return `uniform ${uniform.type} ${name}${length && length > 0 ? `[${length}]` : ""};`;
            }
        };

        // PlaneGeometry class
        _miniGl.PlaneGeometry = class {
            attributes: any;
            xSegCount: number;
            ySegCount: number;
            vertexCount: number;
            quadCount: number;
            width: number;
            height: number;
            orientation: string;

            constructor(width?: number, height?: number, n?: number, i?: number, orientation?: string) {
                context.createBuffer();
                this.xSegCount = 1;
                this.ySegCount = 1;
                this.vertexCount = 4;
                this.quadCount = 2;
                this.width = 1;
                this.height = 1;
                this.orientation = "xz";

                this.attributes = {
                    position: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 3 }),
                    uv: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
                    uvNorm: new _miniGl.Attribute({ target: context.ARRAY_BUFFER, size: 2 }),
                    index: new _miniGl.Attribute({ target: context.ELEMENT_ARRAY_BUFFER, size: 3, type: context.UNSIGNED_SHORT })
                };

                this.setTopology(n, i);
                this.setSize(width, height, orientation);
            }

            setTopology(e = 1, t = 1) {
                const n = this;
                n.xSegCount = e;
                n.ySegCount = t;
                n.vertexCount = (n.xSegCount + 1) * (n.ySegCount + 1);
                n.quadCount = n.xSegCount * n.ySegCount * 2;
                n.attributes.uv.values = new Float32Array(2 * n.vertexCount);
                n.attributes.uvNorm.values = new Float32Array(2 * n.vertexCount);
                n.attributes.index.values = new Uint16Array(3 * n.quadCount);

                for (let e = 0; e <= n.ySegCount; e++) {
                    for (let t = 0; t <= n.xSegCount; t++) {
                        const i = e * (n.xSegCount + 1) + t;
                        n.attributes.uv.values[2 * i] = t / n.xSegCount;
                        n.attributes.uv.values[2 * i + 1] = 1 - e / n.ySegCount;
                        n.attributes.uvNorm.values[2 * i] = (t / n.xSegCount) * 2 - 1;
                        n.attributes.uvNorm.values[2 * i + 1] = 1 - (e / n.ySegCount) * 2;

                        if (t < n.xSegCount && e < n.ySegCount) {
                            const s = e * n.xSegCount + t;
                            n.attributes.index.values[6 * s] = i;
                            n.attributes.index.values[6 * s + 1] = i + 1 + n.xSegCount;
                            n.attributes.index.values[6 * s + 2] = i + 1;
                            n.attributes.index.values[6 * s + 3] = i + 1;
                            n.attributes.index.values[6 * s + 4] = i + 1 + n.xSegCount;
                            n.attributes.index.values[6 * s + 5] = i + 2 + n.xSegCount;
                        }
                    }
                }

                n.attributes.uv.update();
                n.attributes.uvNorm.update();
                n.attributes.index.update();
            }

            setSize(width = 1, height = 1, orientation = "xz") {
                const geometry = this;
                geometry.width = width;
                geometry.height = height;
                geometry.orientation = orientation;

                if (!geometry.attributes.position.values || geometry.attributes.position.values.length !== 3 * geometry.vertexCount) {
                    geometry.attributes.position.values = new Float32Array(3 * geometry.vertexCount);
                }

                const o = width / -2;
                const r = height / -2;
                const segment_width = width / geometry.xSegCount;
                const segment_height = height / geometry.ySegCount;

                for (let yIndex = 0; yIndex <= geometry.ySegCount; yIndex++) {
                    const t = r + yIndex * segment_height;
                    for (let xIndex = 0; xIndex <= geometry.xSegCount; xIndex++) {
                        const rx = o + xIndex * segment_width;
                        const l = yIndex * (geometry.xSegCount + 1) + xIndex;
                        geometry.attributes.position.values[3 * l + "xyz".indexOf(orientation[0])] = rx;
                        geometry.attributes.position.values[3 * l + "xyz".indexOf(orientation[1])] = -t;
                    }
                }

                geometry.attributes.position.update();
            }
        };

        // Mesh class
        _miniGl.Mesh = class {
            geometry: any;
            material: any;
            wireframe: boolean;
            attributeInstances: any[];

            constructor(geometry: any, material: any) {
                const mesh = this;
                mesh.geometry = geometry;
                mesh.material = material;
                mesh.wireframe = false;
                mesh.attributeInstances = [];

                Object.entries(mesh.geometry.attributes).forEach(([e, attribute]: [string, any]) => {
                    mesh.attributeInstances.push({
                        attribute: attribute,
                        location: attribute.attach(e, mesh.material.program)
                    });
                });

                _miniGl.meshes.push(mesh);
            }

            draw() {
                context.useProgram(this.material.program);
                this.material.uniformInstances.forEach(({ uniform, location }: any) => uniform.update(location));
                this.attributeInstances.forEach(({ attribute, location }: any) => attribute.use(location));
                context.drawElements(
                    this.wireframe ? context.LINES : context.TRIANGLES,
                    this.geometry.attributes.index.values.length,
                    context.UNSIGNED_SHORT,
                    0
                );
            }

            remove() {
                _miniGl.meshes = _miniGl.meshes.filter((e) => e !== this);
            }
        };

        // Attribute class
        _miniGl.Attribute = class {
            type: number;
            normalized: boolean;
            buffer: WebGLBuffer;
            target: number;
            size: number;
            values?: Float32Array | Uint16Array;

            constructor(e: any) {
                this.type = context.FLOAT;
                this.normalized = false;
                this.buffer = context.createBuffer()!;
                this.target = e.target;
                this.size = e.size;
                if (e.type) this.type = e.type;
                Object.assign(this, e);
                this.update();
            }

            update() {
                if (this.values !== undefined) {
                    context.bindBuffer(this.target, this.buffer);
                    context.bufferData(this.target, this.values, context.STATIC_DRAW);
                }
            }

            attach(e: string, t: WebGLProgram) {
                const n = context.getAttribLocation(t, e);
                if (this.target === context.ARRAY_BUFFER) {
                    context.enableVertexAttribArray(n);
                    context.vertexAttribPointer(n, this.size, this.type, this.normalized, 0, 0);
                }
                return n;
            }

            use(e: number) {
                context.bindBuffer(this.target, this.buffer);
                if (this.target === context.ARRAY_BUFFER) {
                    context.enableVertexAttribArray(e);
                    context.vertexAttribPointer(e, this.size, this.type, this.normalized, 0, 0);
                }
            }
        };

        const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        _miniGl.commonUniforms = {
            projectionMatrix: new _miniGl.Uniform({ type: "mat4", value: a }),
            modelViewMatrix: new _miniGl.Uniform({ type: "mat4", value: a }),
            resolution: new _miniGl.Uniform({ type: "vec2", value: [1, 1] }),
            aspectRatio: new _miniGl.Uniform({ type: "float", value: 1 })
        };

        // Now it's safe to call setSize since commonUniforms is initialized
        if (width && height) this.setSize(width, height);
    }

    setSize(e = 640, t = 480) {
        this.width = e;
        this.height = t;
        this.canvas.width = e;
        this.canvas.height = t;
        this.gl.viewport(0, 0, e, t);
        this.commonUniforms.resolution.value = [e, t];
        this.commonUniforms.aspectRatio.value = e / t;
    }

    setOrthographicCamera(e = 0, t = 0, n = 0, i = -2e3, s = 2e3) {
        this.commonUniforms.projectionMatrix.value = [
            2 / this.width, 0, 0, 0,
            0, 2 / this.height, 0, 0,
            0, 0, 2 / (i - s), 0,
            e, t, n, 1
        ];
    }

    render() {
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clearDepth(1);
        this.meshes.forEach((e) => e.draw());
    }
}

// Shader files
const shaderFiles = {
    vertex: `varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;
  vec2 st = 1. - uvNorm.xy;
  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);

  vec3 pos = vec3(
    position.x,
    position.y + tilt + incline + noise - offset,
    position.z
  );

  if (u_active_colors[0] == 1.) {
    v_color = u_baseColor;
  }

  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];
      float noise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );
      v_color = blendNormal(v_color, layer.color, pow(noise, 4.));
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`,
    noise: `vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`,
    blend: `vec3 blendNormal(vec3 base, vec3 blend) {
  return blend;
}

vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}`,
    fragment: `varying vec3 v_color;

void main() {
  vec3 color = v_color;
  gl_FragColor = vec4(color, 1.0);
}`
};

interface StripeGradientProps {
    className?: string;
}

const StripeGradient = ({ className = '' }: StripeGradientProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gradientRef = useRef<any>(null);
    const animationRef = useRef<number>();
    const isPlayingRef = useRef(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Emerald brand color scheme — white base with emerald waves
        const colors = [
            normalizeColor(0xffffff),  // Pure white base
            normalizeColor(0x6ee7b7),  // emerald-300 (light wave)
            normalizeColor(0x34d399),  // emerald-400 (medium wave)
        ];

        let minigl: MiniGl;
        let mesh: any;
        let t = 1253106;
        let last = 0;

        const init = () => {
            minigl = new MiniGl(canvas, window.innerWidth, 700);

            const uniforms = {
                u_time: new minigl.Uniform({ value: 0 }),
                u_shadow_power: new minigl.Uniform({ value: 6 }),
                u_darken_top: new minigl.Uniform({ value: 1 }),
                u_active_colors: new minigl.Uniform({ value: [1, 1, 1, 1], type: "vec4" }),
                u_global: new minigl.Uniform({
                    value: {
                        noiseFreq: new minigl.Uniform({ value: [14e-5, 29e-5], type: "vec2" }),
                        noiseSpeed: new minigl.Uniform({ value: 5e-6 })
                    },
                    type: "struct"
                }),
                u_vertDeform: new minigl.Uniform({
                    value: {
                        incline: new minigl.Uniform({ value: 0 }),
                        offsetTop: new minigl.Uniform({ value: -0.5 }),
                        offsetBottom: new minigl.Uniform({ value: -0.5 }),
                        noiseFreq: new minigl.Uniform({ value: [3, 4], type: "vec2" }),
                        noiseAmp: new minigl.Uniform({ value: 320 }),
                        noiseSpeed: new minigl.Uniform({ value: 10 }),
                        noiseFlow: new minigl.Uniform({ value: 3 }),
                        noiseSeed: new minigl.Uniform({ value: 5 })
                    },
                    type: "struct",
                    excludeFrom: "fragment"
                }),
                u_baseColor: new minigl.Uniform({ value: colors[0], type: "vec3", excludeFrom: "fragment" }),
                u_waveLayers: new minigl.Uniform({ value: [], excludeFrom: "fragment", type: "array" })
            };

            // Add wave layers for additional colors
            for (let i = 1; i < colors.length; i++) {
                uniforms.u_waveLayers.value.push(
                    new minigl.Uniform({
                        value: {
                            color: new minigl.Uniform({ value: colors[i], type: "vec3" }),
                            noiseFreq: new minigl.Uniform({ value: [2 + i / colors.length, 3 + i / colors.length], type: "vec2" }),
                            noiseSpeed: new minigl.Uniform({ value: 11 + 0.3 * i }),
                            noiseFlow: new minigl.Uniform({ value: 6.5 + 0.3 * i }),
                            noiseSeed: new minigl.Uniform({ value: 5 + 10 * i }),
                            noiseFloor: new minigl.Uniform({ value: 0.1 }),
                            noiseCeil: new minigl.Uniform({ value: 0.63 + 0.07 * i })
                        },
                        type: "struct"
                    })
                );
            }

            const vertexShader = [shaderFiles.noise, shaderFiles.blend, shaderFiles.vertex].join("\n\n");
            const material = new minigl.Material(vertexShader, shaderFiles.fragment, uniforms);
            const geometry = new minigl.PlaneGeometry();
            mesh = new minigl.Mesh(geometry, material);

            // Set size
            const resize = () => {
                const width = window.innerWidth;
                const height = 700;
                minigl.setSize(width, height);
                minigl.setOrthographicCamera();
                const xSegCount = Math.ceil(width * 0.06);
                const ySegCount = Math.ceil(height * 0.16);
                mesh.geometry.setTopology(xSegCount, ySegCount);
                mesh.geometry.setSize(width, height);
                mesh.material.uniforms.u_shadow_power.value = width < 600 ? 5 : 6;
            };

            resize();
            window.addEventListener('resize', resize);

            // Animation loop
            const animate = (time: number) => {
                if (!isPlayingRef.current) {
                    animationRef.current = requestAnimationFrame(animate);
                    return;
                }

                t += Math.min(time - last, 1000 / 15);
                last = time;
                mesh.material.uniforms.u_time.value = t;
                minigl.render();
                animationRef.current = requestAnimationFrame(animate);
            };

            animationRef.current = requestAnimationFrame(animate);
            canvas.classList.add('isLoaded');

            return () => {
                window.removeEventListener('resize', resize);
            };
        };

        const cleanup = init();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            cleanup?.();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${className}`}
            style={{
                opacity: 0.85,
                transition: 'opacity 1s ease-out'
            }}
        />
    );
};

export default StripeGradient;
