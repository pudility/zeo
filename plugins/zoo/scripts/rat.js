#!/usr/bin/env node

const fs = require('fs');
const THREE = require('/tmp/node_modules/three');

const cutoffBox = new THREE.Box3().setFromCenterAndSize(
  new THREE.Vector3(0, 0.25, 2.22),
  new THREE.Vector3(1, 0.62, 5),
);
const cutoffPlane = new THREE.Plane(
  new THREE.Vector3(0, -1, 0),
  -4.5
);
const _isInFrontOfPlane = (v, plane) => {
  const normalA = plane.normal;
  const A = plane.projectPoint(v);
  const B = v;
  const AB = B.clone().sub(A);
  const dot = AB.clone().dot(normalA);
  return dot > 0;
};
const splitX = 0;
const splitZ = 0;

const o = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const {geometries: geometriesJson} = o;
const geometries = geometriesJson.map(geometry => {
  const {data: {attributes: {position: {array: positionsArray}, normal: {array: normalsArray}, uv: {array: uvsArray}}, index: {array: indicesArray}}} = geometry;

  const result = new Buffer(
    5 * 4 +
    positionsArray.length * 4 +
    normalsArray.length * 4 +
    uvsArray.length * 4 +
    positionsArray.length / 3 * 4 * 4 +
    indicesArray.length * 2
  );
  let byteOffset = 0;

  const header = Uint32Array.from([
    positionsArray.length,
    normalsArray.length,
    uvsArray.length,
    positionsArray.length / 3 * 4,
    indicesArray.length,
  ]);
  new Uint32Array(result.buffer, byteOffset, 5).set(header);
  byteOffset += header.length * 4;

  const positions = Float32Array.from(positionsArray);
  /* const yOffset = 1.25 * 8;
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 1] += yOffset;
  } */
  /* const g = new THREE.BufferGeometry();
  g.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.applyMatrix(new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion()
      .setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0, 1)
      )
  )); */
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 2] *= -1;
  }
  const g = new THREE.BufferGeometry();
  g.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.applyMatrix(new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion()
      .setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, -1)
      )
  ));
  const scale = 0.75;
  g.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
  const minY = (() => {
    let result = Infinity;
    for (let i = 0; i < positions.length / 3; i++) {
      result = Math.min(positions[i * 3 + 1], result);
    }
    return result;
  })();
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 1] -= minY;
  }
console.warn('min y', minY);

  new Float32Array(result.buffer, byteOffset, positions.length).set(positions);
  byteOffset += positions.length * 4;

  const normals = Float32Array.from(normalsArray);
  new Float32Array(result.buffer, byteOffset, normals.length).set(normals);
  byteOffset += normals.length * 4;

  const uvs = Float32Array.from(uvsArray);
  new Float32Array(result.buffer, byteOffset, uvs.length).set(uvs);
  byteOffset += uvs.length * 4;

  const indices = Uint16Array.from(indicesArray);

  const dyVertices = {};
  for (let i = 0; i < positions.length / 3; i++) {
    const v = new THREE.Vector3().fromArray(positions, i * 3);

    if (cutoffBox.containsPoint(v)) {
      const k = v.toArray().join(':');
      dyVertices[k] = true;
    }
  }
  const bucket = new THREE.Vector3(0, 0, Infinity);
  let bucketCount = 0;
  for (let i = 0; i < positions.length / 3; i++) {
    const v = new THREE.Vector3().fromArray(positions, i * 3);
    const k = v.toArray().join(':');
    if (dyVertices[k]) {
      bucket.x += v.x;
      bucket.y += v.y;
      bucket.z = Math.min(v.z, bucket.z);
      bucketCount++;
    }
  }
  bucket.x /= bucketCount;
  bucket.y /= bucketCount;

  const dys = new Float32Array(positions.length / 3 * 4);
  let numMatches = 0;
  for (let i = 0; i < positions.length / 3; i++) {
    const v = new THREE.Vector3().fromArray(positions, i * 3);
    const k = v.toArray().join(':');

    const baseIndex = i * 4;
    if (dyVertices[k]) {
      dys[baseIndex + 0] = v.x - bucket.x;
      dys[baseIndex + 1] = v.y - bucket.y;
      dys[baseIndex + 2] = v.z - bucket.z;
      dys[baseIndex + 3] = 5;
      numMatches++;
    } else {
      dys[baseIndex + 0] = 0;
      dys[baseIndex + 1] = 0;
      dys[baseIndex + 2] = 0;
      dys[baseIndex + 3] = 0;
    }
  }
  new Float32Array(result.buffer, byteOffset, dys.length).set(dys);
  byteOffset += dys.length * 4;
console.warn('total', {percentMatches: numMatches / (positions.length / 3)});

  new Uint16Array(result.buffer, byteOffset, indices.length).set(indices);
  byteOffset += indices.length * 2;

  return result;
});

process.stdout.write(geometries[0]);
