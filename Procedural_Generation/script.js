"use strict";

import { loaderOBJ, loaderMTL } from './parseAndLoad.js';

async function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  const vs = document.querySelector('#vs').text;
  const fs = document.querySelector('#fs').text;

  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  const objects = [];
  const materials = [];
  const baseHref = [];
  const numTrees = 4;

  // carregar árvores
  for (let i = 1; i <= numTrees; i++) {
    const dir = `./objects/Tree_${i}.obj`;
    const obj = await loaderOBJ(dir);
    const [mat, hRef] = await loaderMTL(obj, dir);
    objects.push(obj);
    materials.push(mat);
    baseHref.push(hRef);
  }

  // carregar o chão (floor.obj)
  let dir = './objects/Floor.obj';
  let obj = await loaderOBJ(dir);
  let [mat, hRef] = await loaderMTL(obj, dir);
  objects.push(obj);
  materials.push(mat);
  baseHref.push(hRef);

  const textures = {
    defaultWhite: twgl.createTexture(gl, {src: [150, 250, 120, 255]}),
  };

  gl.clearColor(0.7, 0.6, 0.4, 1.0);

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

  const greenMaterial = {
    diffuse: [0.2, 0.2, 0.1], // verde
    diffuseMap: textures.defaultWhite,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

  // carregar texturas
  for (let i = 0; i < materials.length; i++) {
    for (const material of Object.values(materials[i])) {
      Object.entries(material)
        .filter(([key]) => key.endsWith('Map'))
        .forEach(([key, filename]) => {
          let texture = textures[filename];
          if (!texture) {
            const textureHref = new URL(filename, baseHref[i]).href;
            try {
              texture = twgl.createTexture(gl, { src: textureHref, flipY: true });
              textures[filename] = texture;
            } catch (error) {
              console.error(`Error loading texture: ${filename}`, error);
            }
          }
          material[key] = texture;
        });
    }
  }

  var parts = [];
  // preparar geometrias
  for (let i = 0; i < objects.length; i++) {
    parts.push(objects[i].geometries.map(({ material, data }) => {
      if (data.color) {
        if (data.position.length === data.color.length) {
          data.color = { numComponents: 3, data: data.color };
        }
      } else {
        data.color = { value: [1, 1, 1, 1] };
      }
      const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
      const vao = webglUtils.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
      return {
        material: {
          ...defaultMaterial,
          ...materials[material],
        },
        bufferInfo,
        vao,
      };
    }));
  }

  function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return { min, max };
  }

  function getGeometriesExtents(geometries, variation) {
    return geometries.reduce(({ min, max }, { data }) => {
      const minMax = getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min) * variation),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max) * variation),
      };
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }

  const variationSlider = document.getElementById('variationSlider');
  let variation = parseInt(variationSlider.value);

  let extents = getGeometriesExtents(objects[0].geometries, variation);
  let range = m4.subtractVectors(extents.max, extents.min);
  let objOffset = m4.scaleVector(m4.addVectors(extents.min, m4.scaleVector(range, 0.5)), -1);
  const cameraTarget = [0, 1, 0];
  const radius = m4.length(range) * 1.2;
  const cameraPosition = m4.addVectors(cameraTarget, [0, 0, radius]);
  const zNear = radius / 100;
  const zFar = radius * 30;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function randomPosition(min, max) {
    return [
      min[Math.floor(Math.random() * 3)] + Math.random() * (max[0] - min[2]),
      0,
      min[Math.floor(Math.random() * 3)] + Math.random() * (max[0] - min[2])
    ];
  }

  let treeSliders = [];
  for (let i = 0; i < numTrees; i++) {
    const slider = document.getElementById(`treeSlider${i + 1}`);
    treeSliders.push(slider);
  }

  let numberOfCopies = treeSliders.map(slider => parseInt(slider.value));

  let positions = [];

  
  function updatePositions() {
    positions = [];

    for (let i = 0; i < numTrees; i++) {
      const objectPositions = [];
      for (let j = 0; j < numberOfCopies[i]; j++) {
        objectPositions.push(randomPosition(extents.min, extents.max));
      }
      positions.push(objectPositions);
    }
  } 

  function randomGen() {
    // Atualizar sliders
    treeSliders.forEach((slider, index) => {
      const randomCount = Math.floor(Math.random() * 101); 
      slider.value = randomCount; 
      numberOfCopies[index] = randomCount;
    });
  
    // Atualizar slider de variação
    variation = Math.floor(Math.random() * 11); 
    variationSlider.value = variation.toString(); 
  
    updatePositions();
  }

  updatePositions();
  function render(time) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    time *= 0.001;
  
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
  
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
  
    const up = [0, 1, 0];
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);
  
    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
    };
  
    gl.useProgram(meshProgramInfo.program);
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);
  
    const floorIndex = numTrees;
    // renderizar chão
    for (const { bufferInfo, material } of parts[floorIndex]) {
      let u_world = m4.identity();
      
      webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
      webglUtils.setUniforms(meshProgramInfo, { u_world }, { ...greenMaterial });
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }
  
    // renderizar árvores
    for (let i = 0; i < numTrees; i++) {
      for (let j = 0; j < numberOfCopies[i]; j++) {
        let u_world = m4.yRotation(time * 0.1);
        u_world = m4.translate(u_world, ...positions[i][j]);
  
        for (const { bufferInfo, material } of parts[i]) {
          webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
          webglUtils.setUniforms(meshProgramInfo, { u_world }, material);
          webglUtils.drawBufferInfo(gl, bufferInfo);
        }
      }
    }
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  variationSlider.addEventListener('input', () => {
    variation = parseInt(variationSlider.value);
    extents = getGeometriesExtents(objects[0].geometries, variation);
    range = m4.subtractVectors(extents.max, extents.min);
    objOffset = m4.scaleVector(m4.addVectors(extents.min, m4.scaleVector(range, 0.5)), -1);
    updatePositions();
  });

  const randomizeButton = document.getElementById('randomizeButton');
  randomizeButton.addEventListener('click', randomGen);

  const updateButton = document.getElementById('updateButton');
  updateButton.addEventListener('click', updatePositions);

  treeSliders.forEach((slider, index) => {
    slider.addEventListener('input', () => {
      numberOfCopies[index] = parseInt(slider.value);
      updatePositions();
    });
  });
}

main();
