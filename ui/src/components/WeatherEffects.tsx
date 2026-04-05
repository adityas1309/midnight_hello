import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

function getTimeOfDay() {
  const hour = new Date().getUTCHours()
  if (hour >= 5 && hour < 8)   return 'dawn'
  if (hour >= 8 && hour < 17)  return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

const SKY_COLORS: Record<string, THREE.Color> = {
  dawn:  new THREE.Color(0xcae9ff), // Light blue
  day:   new THREE.Color(0xcae9ff), // Soft blue
  dusk:  new THREE.Color(0xcae9ff), // Light blue
  night: new THREE.Color(0xcae9ff), // Force blue even at night for "light mode"
}

const FOG_COLORS: Record<string, THREE.Color> = {
  dawn:  new THREE.Color(0xe8f5e9),
  day:   new THREE.Color(0xf1f8e9),
  dusk:  new THREE.Color(0xfff3e0),
  night: new THREE.Color(0x0a1410),
}

export default function WeatherEffects() {
  const { scene, gl } = useThree()

  useEffect(() => {
    const tod = getTimeOfDay()
    gl.setClearColor(SKY_COLORS[tod])
    scene.fog = new THREE.Fog(FOG_COLORS[tod], 30, 80)
  }, [gl, scene])

  return null
}
