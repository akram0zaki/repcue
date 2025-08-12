# Beginner-Friendly Blender Guide for RepCue Exercise Videos

This guide explains **exactly where to click** and **what keys to press** to import a Mixamo FBX animation into Blender, align it, frame the camera, trim it to one loop, and prepare it for rendering into RepCue-compatible videos.

---

## 1. Import your FBX into Blender

1. Open Blender.
2. **Delete the default cube** (click it, press `X`, then Enter).
3. Go to **File → Import → FBX (.fbx)**.
4. Select your FBX file from:
   ```
   src/assets/fbx_glb/<exercise-id>.fbx
   ```
5. Leave settings as default (you can check **Automatic Bone Orientation** if bone directions look odd later).
6. Click **Import FBX**.

---

## 2. Make sure the model is on the ground plane

The **ground plane** is the flat grid in the viewport (represents the floor).

1. **Select the model**:
   - Left-click the mesh in the 3D Viewport, OR
   - In the **Outliner** (top right), click the object with the armature or mesh icon.
2. If the model is floating:
   - Press `G` (Grab) → `Z` (limit to vertical axis).
   - Move the mouse down until heels/back just touch the grid.
   - Left-click to confirm.
3. If the model is sunk below:
   - Same steps as above but move up.
4. To check alignment:
   - Press `Numpad 1` for **front view**.
   - Press `Numpad 3` for **side view**.

---

## 3. Select and position the camera

1. In the **Outliner**, click `Camera`.
2. Press `N` to open the **Sidebar** in the viewport.
3. Go to the **Item** tab (first icon).
4. Under **Transform**, enter:

   **Location:**
   ```
   X: 0.0
   Y: -3.2
   Z: 1.4
   ```
   **Rotation:**
   ```
   X: 80.0
   Y: 0.0
   Z: 0.0
   ```

   > For a slight diagonal, change Z rotation to ~15°.
   > For perfect side view use location X=3, Y=0, Z 0.5 and rotation 90,0,90

5. Go to the **Properties panel** (bottom right) → **Camera icon**.
6. Under **Lens**, set:
   ```
   Focal Length: 50mm
   ```

7. Press `Numpad 0` to view through the camera.

---

## 4. Adjust framing to fit the full body

- If limbs are cut off:
  - Press `G` → `Z` to move camera up/down.
  - Press `G` → `Y` to move closer/farther.
  - Or tweak focal length (e.g., 45mm to zoom out, 55mm to zoom in).
- Keep small margins around the body.

---

## 5. Trim the animation to one repetition using the Dope Sheet

### 5.1 Open the Dope Sheet
1. Look at the bottom editor (usually the Timeline).
2. In the **Editor Type** menu (icon in bottom-left corner), choose **Dope Sheet**.
3. In the Dope Sheet header, change **Mode** from "Dope Sheet" to **Action Editor**.

### 5.2 Find the loop boundaries
1. Press `Spacebar` to play.
2. Identify a **distinct pose** (e.g., elbow touches opposite knee).
3. Note the frame number → `F_start`.
4. Wait for the exact same pose again → note frame number → `F_end`.

### 5.3 Set scene range (faster with keyboard shortcuts)
Instead of finding the Start/End boxes, you can use these shortcuts:

1. Move the playhead to **F_start** (drag the blue vertical line or type the number).
2. Press `Ctrl + Home` → sets Start Frame.
3. Move the playhead to **F_end - 1**.
4. Press `Ctrl + End` → sets End Frame.
5. Press `Spacebar` to check loop.

**Calculate `repDurationSeconds`:**
```
repDurationSeconds = (F_end - F_start) / 30
```

---

## 6. Render settings for WebM/VP9

1. Go to **Properties → Output Properties** (printer icon):
   - **Resolution**: `1080x1080` for square variant first.
   - **Frame Rate**: 30 fps.
   - **Frame Range**: `Start` and `End` from step 5.3.

2. Under **Output**:
   - Choose folder: `public/videos/`
   - File name prefix: `<exercise-id>_v1_`

3. **Properties → Output Properties → File Format & Encoding**:
   - File Format: `FFmpeg video`
   - Container: `WebM`
   - Video Codec: `VP9`
   - CRF: `18–24`
   - Keyframe Interval: `30`
   - Pixel Format: `yuv420p`

4. **Render → Render Animation**.

You now have:
```
public/videos/<exercise-id>_v1_1080x1080.webm
```

---

## 7. Render other aspect ratios

Repeat step 6 with:
- **Portrait**: `1080x1920` → `<exercise-id>_v1_1080x1920.webm`
- **Landscape**: `1920x1080` → `<exercise-id>_v1_1920x1080.webm`

---

## 8. Add to RepCue

1. Place WebM files in `public/videos/`.
2. Add entry to `public/exercise_media.json`:
```json
{
  "id": "<exercise-id>",
  "repsPerLoop": 1,
  "fps": 30,
  "video": {
    "square": "/videos/<exercise-id>_v1_1080x1080.webm",
    "portrait": "/videos/<exercise-id>_v1_1080x1920.webm",
    "landscape": "/videos/<exercise-id>_v1_1920x1080.webm"
  }
}
```
3. In `src/data/exercises.ts`, set:
```ts
hasVideo: true,
repDurationSeconds: <value from step 5.3>
```

---

## 9. Test in the app

- Start a workout with the exercise.
- Video should loop exactly with rep counter.
- Pause/resume works, timer syncs.

---

## 10. Keyboard shortcut recap

| Action                           | Shortcut        |
|----------------------------------|-----------------|
| Grab/move                        | G               |
| Move on vertical axis            | G → Z           |
| Rotate                           | R               |
| Confirm move/rotation            | Left-click      |
| Cancel move/rotation             | Right-click / Esc |
| Front view                       | Numpad 1        |
| Side view                        | Numpad 3        |
| Camera view                      | Numpad 0        |
| Play/pause animation             | Spacebar        |
| Open Sidebar                     | N               |
| Delete selected                  | X               |
| Set Start Frame                   | Ctrl + Home     |
| Set End Frame                     | Ctrl + End      |
