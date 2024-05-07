import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

var container;
var camera, scene, renderer, controls;
const jumps = [160, 120, 80, 120, 160];

var marioImg = new Image();
marioImg.src = './textures/mario.png';

var jumpImg = new Image();
jumpImg.src = './textures/marioJump.png';

const loader = new GLTFLoader();

//raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

var shiftSpeed = false;

init();
loadGLTFModels();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 30;

  // scene
  scene = new THREE.Scene();

  var pointLight = new THREE.PointLight(0xffffff, 0.5);
  
  var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 0);
  camera.add(directionalLight);
  scene.add(camera);

  camera.add(pointLight);
  scene.add(camera);

  ///////////
  // FLOOR //
  ///////////

  // note: 4x4 checkboard pattern scaled so that each square is 25 by 25 pixels.

  var floorTexture = new THREE.TextureLoader().load("textures/grass-512.jpg");
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(4, 4);
  var floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide });
  var floorGeometry = new THREE.PlaneGeometry(100, 200, 1, 1);
  var floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.y = -5;
  floor.position.z = -70;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  /////////
  // SKY //
  /////////

  // recommend either a skybox or fog effect (can't use both at the same time) 
  // without one of these, the scene's background color is determined by webpage background

  // make sure the camera's "far" value is large enough so that it will render the skyBox!
  var skyTexture = new THREE.TextureLoader().load("./textures/cielo.jpg");
  var skyBoxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
  // BackSide: render faces from inside of the cube, instead of from outside (default).
  var skyBoxMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide });
  var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
  scene.add(skyBox);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  controls = new TrackballControls(camera, renderer.domElement);

  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.2;

  window.addEventListener("resize", onWindowResize, false);
}

async function loadGLTFModels() {

  //Boo
  var gltfAsset = await loader.loadAsync("./models/boo.glb");
  var gltfModel = gltfAsset.scene;
  gltfModel.scale.set(.02, .02, .02);
  gltfModel.position.y = 7;
  gltfModel.position.x = 10;
  gltfModel.rotation.y = Math.PI; // Rotar 180 grados en el eje Y
  gltfModel.name = "boo";
  scene.add(gltfModel);
  animateBoo();

  // Carga y anima 5 modelos bullet.glb
  for (let i = 0; i < 8; i++) {
    var gltfAsset = await loader.loadAsync("./models/bullet.glb");
    var bullet = gltfAsset.scene;
    bullet.scale.set(.005, .005, .005);
    bullet.position.set(50, 5, 15 - (i*20)); // Ajusta la posición para cada bala
    bullet.name = "bullet" + i; // Da a cada bala un nombre único
    scene.add(bullet);
    animateBullet(bullet, i * 1000 + 1); // Pasa la bala y un retraso a la función animateBullet
  }

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.handleResize();
}

function animate() {
  TWEEN.update();
  requestAnimationFrame(animate);
  render();
  update();
  animateBoo();
}

function update() {
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}


function animateBullet(bullet, delay) {
  bullet.rotation.set(0, 0, 0);
  var originalZ = bullet.position.z; // Guarda la posición original en el eje Z

  var tween = new TWEEN.Tween(bullet.position)
    .to({ x: -50, y: 0, z: originalZ }, 2000)
    .easing(TWEEN.Easing.Exponential.InOut)
    .delay(delay)
    .onComplete(function () {
      var rotate180Y = new TWEEN.Tween(bullet.rotation)
        .to({ y: bullet.rotation.y + Math.PI }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out);
      rotate180Y.chain(tween2);
      rotate180Y.start();
    });

  var tween2 = new TWEEN.Tween(bullet.position)
    .to({ x: 50, y: 5, z: originalZ }, 2000)
    .easing(TWEEN.Easing.Exponential.InOut)
    .onComplete(function() {
      var rotate180Y = new TWEEN.Tween(bullet.rotation)
        .to({ y: bullet.rotation.y + Math.PI }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out);
      rotate180Y.onComplete(function() {
        animateBullet(bullet, 0); // Pasar 0 como retraso para la próxima animación
      });
      rotate180Y.start();
    });

  tween.start();
}

// Variables para almacenar si una tecla está siendo presionada
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

// Velocidad de movimiento de la esfera "boo"
var speed = 0.2;

// Almacenar la posición inicial de "boo"
var initialBooPosition = new THREE.Vector3(0, 1, 25);

function animateBoo() {
  // Obtenemos el modelo "boo" de la escena
  const boo = scene.getObjectByName("boo");

  // Mover la esfera "boo" en función de qué teclas están siendo presionadas
  var currentSpeed = shiftSpeed ? speed * 2 : speed;
  if (moveForward) boo.position.z -= currentSpeed;
  if (moveBackward) boo.position.z += currentSpeed;
  if (moveLeft) boo.position.x -= currentSpeed;
  if (moveRight) boo.position.x += currentSpeed;

  // Hacer que la cámara mire siempre a "boo"
  camera.lookAt(boo.position);

  // Comprobar si "boo" ha colisionado con cualquiera de los cubos
  for (let i = 0; i < 8; i++) {
    const bullet = scene.getObjectByName("bullet" + i);
    if (bullet) { // Verificar que bullet no sea undefined
      const booBox = new THREE.Box3().setFromObject(boo);
      const bulletBox = new THREE.Box3().setFromObject(bullet);
      if (booBox.intersectsBox(bulletBox)) {
        // Si "boo" ha colisionado con el cubo, restablecer su posición a la posición inicial
        boo.position.copy(initialBooPosition);
        break;
      }
    }
  }

  // Comprobar si "boo" ha llegado a la posición -150 en el eje z
  if (boo.position.z <= -150) {
    // Si "boo" ha llegado a la posición -150, mostrar un mensaje de alerta y restablecer su posición a la posición inicial
    alert("¡HAS GANADO!");
    boo.position.copy(initialBooPosition);
  }
}

function onPointerMove(event) {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(pointer, camera);

  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children);
  for (let i = 0; i < intersects.length; i++) {
    console.log(intersects[i].object.name);
    // Removed the interaction with the object
  }
}


// Agregar controladores de eventos para las teclas del teclado
document.addEventListener('keydown', function (event) {
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    shiftSpeed = true;
  }
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveForward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      moveBackward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      moveLeft = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      moveRight = true;
      break;
  }
});

document.addEventListener('keyup', function (event) {
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    shiftSpeed = false;
  }
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveForward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      moveBackward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      moveLeft = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      moveRight = false;
      break;
  }
});
window.addEventListener('mousedown', onPointerMove);