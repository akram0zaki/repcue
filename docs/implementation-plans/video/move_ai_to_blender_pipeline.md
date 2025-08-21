# Using Move.ai Mocap Files in the RepCue Blender Pipeline

## Overview
When an exercise animation is **not available** in Mixamo, you can use **Move.ai** to record it yourself and export as FBX. This guide shows how to integrate a Move.ai mocap file into the RepCue animation/video pipeline we built.

---

## Paths to Integration

### **A) Fast Path – Use Move.ai Actor Directly**
If you don’t need the exact same avatar for every exercise, you can use the exported mocap character as-is.

1. **Record & Export from Move.ai**
   - Record the exercise.
   - Export as **FBX** at **30 FPS**.
   - Name the file according to your exercise ID, e.g., `bicycle-crunches.fbx`.

2. **Place in Assets Folder**
   - Save the file to:
     ```
     assets/fbx_glb/bicycle-crunches.fbx
     ```

3. **Render**
   - Build a multi-scene catalog:
     ```bash
     blender -b -P build_catalog_blend.py -- \
       --template "/path/to/repcue_template.blend" \
       --src "/assets/fbx_glb" \
       --out_blend "/assets/repcue_exercises_catalog.blend" \
       --ids bicycle-crunches plank push-ups
     ```
   - Render all scenes:
     ```bash
     blender -b "/assets/repcue_exercises_catalog.blend" -P render_catalog_scenes.py -- \
       --out "/assets/videos" --fps 30 --seconds 2.2
     ```

✅ **Pros**: Quickest workflow.  
⚠️ **Cons**: Visual style may differ from other animations.

---

### **B) Retarget to Mixamo Avatar for Consistency**
If you want the same avatar, camera, and style for all exercises, retarget the mocap data to your Mixamo rig.

#### 1. Prepare the Template
- Open `repcue_template.blend`.
- Import your **Mixamo character FBX** (e.g., Y-Bot).
- Save this as your base template.

#### 2. Import Move.ai FBX
- `File → Import → FBX` → select `bicycle-crunches.fbx`.
- You will now have:
  - `Armature_Mixamo` (Mixamo rig)
  - `Armature_Mocap` (Move.ai rig)

#### 3. Retarget via Constraints
- Select `Armature_Mixamo`, switch to **Pose Mode**.
- For each major bone, add **Copy Rotation** (and optionally Copy Location) constraints targeting the mocap rig.
- Common bone mapping:
  - Hips/root → Hips/root
  - Spine/Chest → Spine/Chest
  - Head → Head
  - Arms/Legs → corresponding mocap bones
- Adjust influence or offsets to fine-tune.

#### 4. Loop and Align
- Match FPS (30).
- Trim animation to exactly one repetition loop.
- Align first and last frame for smooth looping.

#### 5. Hide Mocap Actor
- In Outliner, disable mocap armature/mesh from render.

#### 6. Save and Render
- Save scene and run:
  ```bash
  blender -b -P render_catalog_scenes.py -- \
    --out "/assets/videos" --fps 30 --seconds 2.2
  ```

✅ **Pros**: Perfect visual consistency.  
⚠️ **Cons**: Takes ~10–20 min for initial bone mapping.

---

## Tips & Troubleshooting

### Foot Sliding
- Keep Mixamo root controlling location.
- Add IK to feet if needed.

### Scale Mismatch
- Apply uniform scale to 1.0 for both rigs (`Ctrl+A → Apply Scale`).

### FPS Mismatch
- Export from Move.ai at **30 FPS** or resample in Blender.

### A‑Pose/T‑Pose Offset
- Add a one-frame pose key to align Mixamo rig to mocap's start pose.

### Noise/Jitters
- Use Blender's **Smooth Keys** on noisy bones.

---

## Recommendation
- For **rare or one-off moves**, use Path A.
- For **catalog consistency**, use Path B.

---

## References
- [Move.ai](https://www.move.ai/)
- [Blender – Constraints Manual](https://docs.blender.org/manual/en/latest/animation/constraints/introduction.html)
- [Mixamo](https://www.mixamo.com/)
