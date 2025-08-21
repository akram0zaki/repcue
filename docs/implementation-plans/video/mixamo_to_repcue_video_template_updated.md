# [EXERCISE NAME] → Loopable Video for RepCue (End‑to‑End Guide)

This template walks you through turning a **Mixamo animation** into a **loopable WebM video** for use in RepCue’s timer UI.

---

## 1) Get the animation from Mixamo

1. Go to the Mixamo search page and find **[EXERCISE NAME]**.
2. In **Characters**, choose a neutral avatar (e.g., **Y‑Bot**).
3. Select the animation and adjust:
   - **Overdrive:** `0.8–1.0` (1.0 = original speed; lower slows down).
   - **Trim:** isolate **exactly one rep** of the movement.
     - For alternating moves, define one rep as **both sides completed**.
     - Identify start/end on identical poses, trimming to 1 frame before the repeated pose for seamless looping.
   - **In Place:** On or Off depending on exercise type.
4. **Download** with these settings:
   - **Format:** `FBX Binary (.fbx)`
   - **Skin:** `With Skin`
   - **Frames per Second:** `30`
   - **Keyframe Reduction:** `none`
5. Save as `[exercise-id].fbx`.

---

## 2) Organize your files

```
src/
  assets/
    fbx_glb/
      [exercise-id].fbx

public/
  videos/
```

---

## 3) Prepare Blender template

- Use your prebuilt `repcue_template.blend` (camera, ground, lights).
- If not yet created, generate it via your Blender script (`create_repcue_template_with_placeholder.py`), then save as `repcue_template.blend`.

---

## 4) Import FBX & position the model

1. Open `repcue_template.blend`.
2. **File → Import → FBX** → select `src/assets/fbx_glb/[exercise-id].fbx`.
3. Position the model at world origin (`Alt+G`, `Alt+R`).
4. Adjust camera to fit the move in frame (side 3/4 angle recommended).

---

## 5) Define exact loop length

1. In the **Dope Sheet / Action Editor**, find `F_start` (distinct pose) and `F_end` (same pose repeated).
2. FPS = 30. Set:
   - **Frame Start** = `F_start`
   - **Frame End** = `F_end - 1`
3. Loop should now play seamlessly.
4. `repDurationSeconds` = `(F_end - F_start) / 30`.

---

## 6) Render WebM/VP9

Render 3 variants:

| Variant     | Resolution  | Filename pattern                                     |
|-------------|-------------|------------------------------------------------------|
| Square      | 1080×1080   | `[exercise-id]_v1_1080x1080.webm`                     |
| Portrait    | 1080×1920   | `[exercise-id]_v1_1080x1920.webm`                     |
| Landscape   | 1920×1080   | `[exercise-id]_v1_1920x1080.webm`                     |

**Render settings in Blender:**
- **File Format:** `FFmpeg video`
- **Container:** `WebM`
- **Video Codec:** `VP9`
- **CRF:** `18–24`
- **Keyframe Interval:** `30`
- **Pixel Format:** `yuv420p`

Save in `public/videos/`.

> If VP9 is too slow, render MP4/H.264 first, then convert with:
> ```bash
> ffmpeg -i in.mp4 -c:v libvpx-vp9 -b:v 0 -crf 28 -row-mt 1 -pix_fmt yuv420p out.webm
> ```

---

## 7) Update RepCue data

**`public/exercise_media.json`:**
```json
{
  "id": "[exercise-id]",
  "repsPerLoop": 1,
  "fps": 30,
  "video": {
    "square": "/videos/[exercise-id]_v1_1080x1080.webm",
    "portrait": "/videos/[exercise-id]_v1_1080x1920.webm",
    "landscape": "/videos/[exercise-id]_v1_1920x1080.webm"
  }
}
```

**`src/data/exercises.ts`:**
```ts
hasVideo: true,
repDurationSeconds: [calculated from step 5]
```

---

## 8) Test in app

1. Add the exercise to a workout.
2. Start timer → video should play inside ring.
3. Rep counter should pulse on each loop boundary.
4. Pause/resume → video responds accordingly.

---

## 9) Checklist

- [ ] Downloaded FBX Binary / With Skin / 30 FPS / no keyframe reduction.
- [ ] Trimmed in Blender for 1 rep loop.
- [ ] Rendered 1080×1080, 1080×1920, 1920×1080 WebM/VP9.
- [ ] Files placed in `public/videos/`.
- [ ] `exercise_media.json` updated.
- [ ] `hasVideo: true` + `repDurationSeconds` set.
- [ ] Tested in app.

---

## Notes

- Always confirm loop length visually to avoid subtle jumps.
- For static holds (TIME_BASED), use 5s or 10s loops instead of rep-based trimming.
- Keep camera and lighting consistent across all exercises for a professional look.
