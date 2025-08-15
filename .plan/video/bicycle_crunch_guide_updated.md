# Bicycle Crunch → Loopable Video for RepCue (End‑to‑End Guide)

This guide takes you from a **Mixamo animation** to a **loopable WebM video** that RepCue can play inside the timer ring.

> TL;DR outputs you need (put these in `public/videos/`):  
> - `bicycle-crunches_v1_1080x1080.webm`  
> - `bicycle-crunches_v1_1080x1920.webm`  
> - `bicycle-crunches_v1_1920x1080.webm`  
> and set `hasVideo: true` for `bicycle-crunches` in `src/data/exercises.ts` and add entry in `public/exercise_media.json` (if it isn’t there already).

---

## 1) Get the animation from Mixamo

1. Open the Mixamo search page for **Bicycle Crunch** (you already have it).  
2. In the **Characters** tab, choose a neutral avatar (e.g., **Y‑Bot**).  
3. Back on **Animations**, click **Bicycle Crunch** and adjust in the right panel:
   - **Overdrive:** `0.8–1.0` (1.0 is default pace; lower if you want slower).
   - **Trim:** set start/end so **one loop equals _one full rep_**.  
     - For alternating moves, define **one rep as Left + Right** (both sides).  
     - Scrub until the **same-side elbow‑knee contact** repeats; mark that as end (one frame **before** the exact match to avoid a duplicate frame seam).
   - **In Place:** Off (not relevant lying down).
4. Click **Download** and use these parameters:
   - **Format:** `FBX Binary (.fbx)`  
   - **Skin:** `With Skin`  ✅ (ensures a mesh is included for rendering)  
   - **Frames per Second:** `30`  ✅  
   - **Keyframe Reduction:** `none`  ✅  
5. Save the file as `bicycle-crunches.fbx`.

> Why “With Skin”? It includes the visible mesh. You can use “Without Skin” if you’re retargeting to your own character, but for quick rendering in Blender, **With Skin** is simpler.

---

## 2) Prepare folders

```
src/
  assets/
    fbx_glb/
      bicycle-crunches.fbx

public/
  videos/
```

---

## 3) Set up Blender (once)

If you haven’t already created it, generate the standard RepCue scene template (camera, ground, lights). You can use the script you have (`create_repcue_template_with_placeholder.py`) to build and **save as** `repcue_template.blend`.

- Open Blender → **Scripting** → paste the script → **Run** → File → **Save As** `repcue_template.blend`.

This gives you consistent lighting and camera across all clips.

---

## 4) Import the FBX and frame the shot

1. Open `repcue_template.blend`.
2. **File → Import → FBX**, choose `src/assets/fbx_glb/bicycle-crunches.fbx`.
   - In the FBX importer, you can leave defaults; if you see odd bone axes, tick **Automatic Bone Orientation**.
3. Place the character at the world origin if needed (Object Mode → `Alt+G` to clear location, `Alt+R` to clear rotation). Make sure they’re lying above the ground plane.
4. **Camera framing suggestions** (side 3/4 view is best for form):
   - Location: `X=0.0, Y=-3.2, Z=1.4`
   - Rotation: `X≈80°`, `Y=0°`, `Z≈0°`
   - Focal length: `50mm`
   - Adjust to keep the full body in frame with some margin.

> Tip: For floor exercises, a slightly higher camera helps avoid clipping with the ground plane and shows the torso twist clearly.

---

## 5) Make the loop seamless (exactly 1 rep)

1. Open the **Dope Sheet → Action Editor** (or **Non‑Linear Animation** editor).  
2. Find the natural cycle length:
   - Play the animation and identify a **distinct pose** (e.g., right elbow touches left knee).  
   - Note the frame number (`F_start`).  
   - Let the same event happen again and note that frame (`F_end`).  
   - **Cycle length** = `F_end - F_start` frames.
3. Set scene FPS to **30** and set:
   - **Frame Start** = `F_start`
   - **Frame End** = `F_end - 1`  (avoid duplicate first/last frame to kill the seam)
4. In the timeline header: make sure the play range matches exactly. Scrub start→end→start; the pose should match perfectly.

> Example: if the contacts happen at frame 12 and 72, set Start `12`, End `71`. Resulting **repDurationSeconds** = `(72-12)/30 = 2.0s`. You’ll use this value in `exercises.ts`.

---

## 6) Render settings (WebM/VP9)

RepCue uses `.webm` first (with optional `.mp4` fallback). Blender can render WebM directly.

1. **Output Properties** (printer icon):
   - **Resolution:** set the first pass to **1080 × 1080** (square).  
   - **Frame Rate:** `30 fps`.  
   - **Frame Range:** ensure it matches your loop (from Step 5).

2. **Output** (folder path):  
   Set to `public/videos/bicycle-crunches_v1_` (Blender will append the extension).

3. **File Format & Encoding:**  
   - **File Format:** `FFmpeg video`  
   - **Container:** `WebM`  
   - **Video Codec:** `VP9`  
   - **Keyframe Interval (GOP):** `30`  
   - **Rate Control:** choose **Constant Rate Factor (CRF)**; lower = higher quality (e.g., `18–24`).  
   - **Color:** `8-bit yuv420p` (browser-safe)

4. **Render → Render Animation**.  
   You should get:  
   `public/videos/bicycle-crunches_v1_1080x1080.webm`

### Alternative (faster): MP4 first → convert to WebM
VP9 encoding can be slow on some CPUs. If needed:
- In Blender, set **Container: MPEG‑4**, **Codec: H.264**, then render MP4.  
- Convert with `ffmpeg`:
  ```bash
  ffmpeg -i bicycle-crunches_v1_1080x1080.mp4 -c:v libvpx-vp9 -b:v 0 -crf 28 -row-mt 1          -pix_fmt yuv420p bicycle-crunches_v1_1080x1080.webm
  ```

---

## 7) Render the other two aspect ratios

Repeat Step 6 with only **resolution** changed:

- **Portrait:** `1080 × 1920` → `bicycle-crunches_v1_1080x1920.webm`  
- **Landscape:** `1920 × 1080` → `bicycle-crunches_v1_1920x1080.webm`

> Want one‑click rendering? You can use your Blender add‑on but switch its encoding to WebM/VP9, or render MP4 via the add‑on and convert to WebM with `ffmpeg` using the command above.

---

## 8) Wire it into RepCue

1. **Place files**  
   Move the three WebM files into `public/videos/`.

2. **exercise_media.json** (in `public/`): ensure an entry exists like:
```json
{
  "id": "bicycle-crunches",
  "repsPerLoop": 1,
  "fps": 30,
  "video": {
    "square": "/videos/bicycle-crunches_v1_1080x1080.webm",
    "portrait": "/videos/bicycle-crunches_v1_1080x1920.webm",
    "landscape": "/videos/bicycle-crunches_v1_1920x1080.webm"
  }
}
```

3. **exercises.ts**  
   - Set `hasVideo: true` for `"bicycle-crunches"`.  
   - Set `repDurationSeconds` based on Step 5. Example for the 12→72 case:
     ```ts
     repDurationSeconds: 2.0
     ```

4. **Run the app** and open a workout containing Bicycle Crunch.  
   - Start the timer → the video plays **inside the ring**; rep counter pulses each loop (Left+Right).  
   - Pause/resume → video follows. Reset/complete → video stops.

---

## 9) Troubleshooting

- **Seam visible when looping** → Make sure **End = last frame - 1** where the first and last poses match exactly.  
- **Model appears too small/large** → Apply scale (`Ctrl+A → Scale`) to `1.0`, and ensure camera framing is updated.  
- **Can’t autoplay on iOS** → Ensure the `<video>` element is **muted** and **playsInline**, and **don’t call `.play()`** until the timer switches to “running”.  
- **Encoding slow** → Render MP4 first, then convert to WebM using `ffmpeg` (command above).  
- **Ground clipping** → Raise the rig slightly or rotate the torso a tad so heels don’t dig into the plane.

---

## 10) Quick checklist

- [ ] Download from Mixamo: **FBX Binary**, **With Skin**, **30 FPS**, **Keyframe Reduction: none**  
- [ ] Trim in Mixer to roughly 1 rep; finalize loop in Blender exactly (first pose = last pose − 1 frame)  
- [ ] Render WebM/VP9 at: **1080×1080**, **1080×1920**, **1920×1080**  
- [ ] Files in `public/videos/` with names:  
  `bicycle-crunches_v1_1080x1080.webm`, `bicycle-crunches_v1_1080x1920.webm`, `bicycle-crunches_v1_1920x1080.webm`  
- [ ] `public/exercise_media.json` updated  
- [ ] `src/data/exercises.ts` → `hasVideo: true`, `repDurationSeconds` set  
- [ ] Test in app: timer start/stop sync, rep pulse on loop boundary

---

### Appendix: Estimating `repDurationSeconds`
If your cycle frames are `F_start`→`F_end`, then:
```
repDurationSeconds = (F_end - F_start) / 30
```
Round to 2 decimals. Use this for the **ring** pacing; the **video** loops itself.
