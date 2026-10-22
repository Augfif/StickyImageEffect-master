const fragment = `
uniform vec2 u_resolution;

uniform sampler2D u_texture;
uniform sampler2D u_texture2;
uniform sampler2D u_depth;
uniform sampler2D u_depth2;

// Per image fit, in image UV per viewport UV: below 1 the picture is cropped
// to fill the screen (cover), above 1 it is letterboxed on one axis (contain).
uniform vec2 u_textureFit;
uniform vec2 u_texture2Fit;
// Image UV that lands in the middle of the screen, so a slide can be
// composed around a subject instead of always being centered.
uniform vec2 u_textureFocus;
uniform vec2 u_texture2Focus;
// Viewport UV per plane UV, the plane is wider than the visible frustum.
uniform vec2 u_planeViewportScale;

uniform float u_textureProgress;

// Fake 3D
uniform vec2 u_mouse;
uniform float u_parallaxStrength;
uniform vec3 u_background;

varying vec2 vUv;

vec2 toViewportUV(vec2 planeUV) {
    return (planeUV - 0.5) * u_planeViewportScale + 0.5;
}
vec2 toImageUV(vec2 viewportUV, vec2 fit, vec2 focus) {
    return (viewportUV - 0.5) * fit + focus;
}
// 1.0 inside the picture, 0.0 in the letterboxed margin.
float insideImage(vec2 imageUV) {
    vec2 inside = step(vec2(0.0), imageUV) * step(imageUV, vec2(1.0));
    return inside.x * inside.y;
}
// Depth of the pixel, 0.5 (no displacement) outside of the picture.
float depthAt(sampler2D depthMap, vec2 imageUV) {
    return mix(0.5, texture2D(depthMap, imageUV).r, insideImage(imageUV));
}
// Viewport space offset, identical pixel shift on both axes, so the photo
// does not shear when the pointer moves diagonally.
vec2 parallaxOffset(float depth) {
    vec2 aspectFix = vec2(u_resolution.y / u_resolution.x, 1.0);
    return (depth - 0.5) * u_parallaxStrength * aspectFix * u_mouse;
}
void main(){
    // On THREE 102 The image is has Y backwards
    // vec2 flipedUV = vec2(vUv.x,1.-vUv.y);
    vec2 viewportUV = toViewportUV(vUv);

    vec2 base1 = toImageUV(viewportUV, u_textureFit, u_textureFocus);
    vec2 base2 = toImageUV(viewportUV, u_texture2Fit, u_texture2Focus);

    // Sampling at (uv - offset) moves the close pixels towards the pointer.
    // u_mouse is +1 at the right edge and +1 at the top edge.
    vec2 sample1 = toImageUV(
        viewportUV - parallaxOffset(depthAt(u_depth, base1)),
        u_textureFit,
        u_textureFocus
    );
    vec2 sample2 = toImageUV(
        viewportUV - parallaxOffset(depthAt(u_depth2, base2)),
        u_texture2Fit,
        u_texture2Focus
    );

    // The letterbox test uses the undisplaced position, so the margins stay
    // put while the picture slides inside its frame.
    vec4 color1 = mix(vec4(u_background, 1.0), texture2D(u_texture, sample1), insideImage(base1));
    vec4 color2 = mix(vec4(u_background, 1.0), texture2D(u_texture2, sample2), insideImage(base2));

    gl_FragColor = mix(color1, color2, u_textureProgress);
}
`;

const vertex = `
#define PI 3.14159265359
uniform float u_offset;
uniform float u_progress;
uniform float u_direction;
uniform float u_time;
uniform float u_waveIntensity;
varying vec2 vUv;
void main(){
    vec3 pos = position.xyz;

    float distance = length(uv.xy - 0.5 );
    float sizeDist = length(vec2(0.5,0.5));
    float normalizedDistance = distance/sizeDist ;

    float stickOutEffect = normalizedDistance ;
    float stickInEffect = -normalizedDistance ;

    
    float stickEffect = mix(stickOutEffect,stickInEffect, u_direction);

    // Backwards V wave.
    float stick = 0.5;

    float waveIn = u_progress*(1. / stick); 
    float waveOut =  -( u_progress - 1.) * (1./(1.-stick) );
    waveOut = pow(smoothstep(0.,1.,waveOut),0.7);

    float stickProgress = min(waveIn, waveOut);





    // We can re-use stick Influcse because this oen starts at the same position
    float offsetInProgress = clamp(waveIn,0.,1.);

    // Invert stickout to get the slope moving upwards to the right
    // and move it left by 1
    float offsetOutProgress = clamp(1.-waveOut,0.,1.);

    float offsetProgress = mix(offsetInProgress,offsetOutProgress,u_direction);


    float stickOffset = u_offset;
    pos.z += stickEffect * stickOffset * stickProgress  - u_offset * offsetProgress;

    
    // Oscillation speed halved (was u_time * 2.), amplitude untouched.
    pos.z += sin(distance * 8. - u_time * 1. )  * u_waveIntensity;

    gl_Position =   
        projectionMatrix * 
        modelViewMatrix * 
         vec4(pos, 1.0);

    vUv = uv;
}
`;

export {
    fragment,
    vertex
};
