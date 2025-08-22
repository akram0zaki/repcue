# Blender Scene Template Instructions for RepCue Exercise Clips (Enriched)

This enriched template expands the basic instructions with extra details, shortcuts, and troubleshooting tips so you can follow along easily in Blender.

---

## 1. Scene Units & World
- **Start a new scene** → File → New → General.  
- Delete the default cube, light, and camera (select → X).  
- Go to **Scene Properties (cone icon) → Units**:  
  - Unit Scale = **1.0**  
  - Length = **Metric**  

- In **World Properties (globe icon)**:  
  - Enable **Use Nodes**.  
  - Set **Background color** to mid‑gray:  
    - RGBA = **(0.1, 0.1, 0.1, 1.0)**  
    - In the color picker, switch to **RGB tab** and enter R=0.1, G=0.1, B=0.1, A=1.0.  
    - Equivalent Hex: `#1a1a1aff`  
  - Strength = **1.0**  

💡 *Tip: If you can’t see the RGB fields, click the "RGB" button in the color wheel popup.*

---

## 2. Ground Plane
1. Make sure you are in **Object Mode** (top‑left dropdown or press `Tab` until you see "Object Mode").  
2. Add a plane:  
   - Menu: **Add → Mesh → Plane**  
   - or shortcut: **Shift + A → Mesh → Plane**  
3. Scale to 20 m:  
   - Press **S → 20 → Enter**  
4. Add material:  
   - Go to **Material Properties (red sphere)** → New → Rename: `GroundMat`  
   - Surface → Base Color: set to (0.12, 0.12, 0.12, 1.0).  

---

## 3. Camera Setup
1. Add a camera: **Shift + A → Camera**.  
2. Place the camera:  
   - Select camera → go to **Object Properties (orange square)**.  
   - For **standing moves**: Location = (3, ‑5, 2.5), Rotation = (X=75°, Y=0°, Z=32°), Focal Length = 40 mm (in Camera Properties - camera icon)
   - For **floor moves**: Location = (4, ‑3.2, 1.0), Rotation = (X=85°, Y=0°, Z=50°), Focal Length = 50 mm (in Camera Properties - camera icon)
3. Camera settings:  
   - In **Camera Properties (camera icon)**:  
     - Sensor Fit = Auto  
4. View through camera: **Numpad 0** (or `View → Cameras → Active Camera`).  

💡 *Quick framing tip*: Navigate the viewport to the angle you like, then press **Ctrl + Alt + Numpad 0** to snap the camera to your current view.

---

## 4. Lighting
1. Add Key Light: **Shift + A → Light → Area**.  
   - Rename to `Key`  
   - Location = (3, ‑6, 3)  
   - Rotation = (65°, 0°, 30°)  
   - Power = 1500W  
   - Size = 5 m  
2. Add Fill Light:  
   - Location = (‑3, ‑3, 2.5)  
   - Rotation = (‑25°, 0°, ‑35°)  
   - Power = 800W  
   - Size = 5 m  
3. Add Rim Light:  
   - Location = (0, 3, 2.5)  
   - Rotation = (‑225°, -180°, 185°)  
   - Power = 600W  
   - Size = 3 m  

---

## 5. Importing Animations
- File → Import → FBX (or GLB).  
- In the importer, tick **Automatic Bone Orientation** for FBX if needed.  
- Ensure armature and mesh are centered at the origin (0,0,0).  
- Use **Alt + G** (clear location) and **Alt + R** (clear rotation) to reset if they appear off.  
- Make sure feet rest on the ground plane.  

---

## 6. Loop Timing
1. Open **Dope Sheet → Action Editor**.  
2. Play the animation (`Spacebar`) and note a distinct start pose. Call it `F_start`.  
3. When the same pose repeats, note that frame as `F_end`.  
4. Set:  
   - Frame Start = `F_start`  
   - Frame End = `F_end - 1`  
5. Verify seamless looping by playing back.  

Formula for loop duration:  
```
repDurationSeconds = (F_end - F_start) / 30
```

---

## 7. Static Pose Idle
- For holds (like plank):  
  - Select armature root bone.  
  - Insert rotation keyframes at first and last frame.  
  - Add ~2° variation on Z or X.  

---

## 8. Render Settings
1. Output Properties (printer icon):  
   - Resolution presets: 1080×1080, 1080×1920, 1920×1080.  
   - Frame Rate = 30 fps.  
   - File Format = FFmpeg Video.  
   - Encoding: MPEG‑4, Codec: H.264, Quality: Perceptually Lossless.  
   - Alternative: WebM/VP9 for browser playback.  
2. Output path: `/videos/{exercise_id}_v1_{WxH}.mp4`.  
3. Render → Render Animation.  

---

## 9. Saving Template
- Save as `repcue_template.blend`.  
- For each exercise:  
  - Open template, import animation.  
  - Adjust camera height (floor vs standing).  
  - Set correct aspect ratio.  
  - Render.  

---

## Appendix: Viewport Navigation
- Rotate view: **Middle Mouse drag** (or Alt + Left click).  
- Pan: **Shift + MMB drag** (or Shift + Alt + Left click).  
- Zoom: **Scroll wheel** (or Ctrl + Alt + Left drag).  
- Focus on object: select it → press **Numpad . (period)**.  
- Reset view: **Shift + C**.  
- Orthographic toggle: **Numpad 5**.  
- Fly mode: **Shift + ~ (tilde)**, then use WASD to move like in a video game.  

---

This enriched guide should now give you both the precise values from the template **and** practical how‑to steps so you can set up scenes quickly even if you’re new to Blender.
