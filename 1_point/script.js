'use strict';

window.onload = main;

function main(){
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector('#canvas');
    const gl = canvas.getContext('webgl2');

    //============== Preparing Shaders ==============

    // Get GLSL Code for shader in HTML
    // Obtém o código GLSL para o shader que está no HTML
    const vertex_GLSL = document.querySelector('#vertex_shader').text;

    // Create shader for WebGL
    // Cria o Shader para o WebGL
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);

    // Provide the code
    // Fornece o Código
    gl.shaderSource(vertexShader,vertex_GLSL);

    // It needs to be compiled because WebGL is compatible with different devices
    // É necessário compilar pois o WebGL é compativel com diferentes máquinas
    gl.compileShader(vertexShader);


    // Verify the string GLSL Code, highly recommended after compiling
    // WebGL stores errors in a stack, if no error is found, perform a binary search starting from the middle of the code

    // Verificação do codigo string, altamente recomendado após compilar
    // !!! WebGL guarda os erros em um Pilha !!!
    // Caso não encontre algum erro faça uma busca binaria, começe na metade do código.
    if (!gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(vertexShader));
    }

    // The process is the samme for fragment shader
    // *** Neste exemplo o processo é identico para o fragment Shader ***

    const fragment_GLSL = document.querySelector('#fragment_shader').text;
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader,fragment_GLSL);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(fragmentShader));
    }

    // Create program to link everything in WebGL
    // == Necessário fazer a criação do programa para linkar tudo no WebGL ==

    const prog = gl.createProgram();
    gl.attachShader(prog,vertexShader);
    gl.attachShader(prog,fragmentShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog,gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog));
    }

    gl.useProgram(prog);
    gl.drawArrays(gl.POINTS,0,1);
};