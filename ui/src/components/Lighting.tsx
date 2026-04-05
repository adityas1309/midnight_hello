export default function Lighting() {
  return (
    <>
      <ambientLight intensity={1.2} color={0xffffff} />
      <directionalLight
        position={[20, 50, 20]}
        intensity={2.2}
        color={0xfffaf0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <pointLight position={[0, 20, 0]} intensity={0.5} color={0xfff5cc} />
    </>
  )
}
