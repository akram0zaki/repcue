
bl_info = {
    "name": "RepCue Triple-Aspect Render",
    "author": "ChatGPT",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "Properties > Output (Render Properties) > RepCue",
    "description": "Render current scene in 1080x1080, 1080x1920, 1920x1080 with consistent naming",
    "category": "Render",
}

import bpy
import os
from bpy.props import StringProperty, FloatProperty, BoolProperty

def ensure_video_settings(scene):
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'LOW'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.ffmpeg.gopsize = scene.render.fps

def set_resolution(scene, aspect):
    if aspect == "square":
        scene.render.resolution_x = 1080
        scene.render.resolution_y = 1080
    elif aspect == "portrait":
        scene.render.resolution_x = 1080
        scene.render.resolution_y = 1920
    else:
        scene.render.resolution_x = 1920
        scene.render.resolution_y = 1080

class REPCUE_Props(bpy.types.PropertyGroup):
    output_dir: StringProperty(
        name="Output Dir",
        subtype='DIR_PATH',
        default="//videos/"
    )
    exercise_id: StringProperty(
        name="Exercise ID",
        description="Used in file names, e.g., squats",
        default="exercise"
    )
    seconds: FloatProperty(
        name="Seconds per Loop",
        description="Duration for one loop (rep).",
        default=2.2, min=0.3, max=10.0
    )
    static_seconds: FloatProperty(
        name="Seconds (Static)",
        description="Duration for static holds.",
        default=10.0, min=1.0, max=60.0
    )
    is_static: BoolProperty(
        name="Static Hold",
        description="If true, uses Static Seconds for duration.",
        default=False
    )
    is_floor: BoolProperty(
        name="Floor Move",
        description="Sets a lower camera height in your template if you use a driver/constraint",
        default=False
    )

class REPCUE_OT_render(bpy.types.Operator):
    bl_idname = "repcue.render_triple"
    bl_label = "Render 3 Aspect Ratios"
    bl_description = "Render 1080x1080, 1080x1920, 1920x1080 to MP4"
    bl_options = {'REGISTER'}

    def execute(self, context):
        scn = context.scene
        props = scn.repcue_props

        # Duration
        fps = scn.render.fps or 30
        seconds = props.static_seconds if props.is_static else props.seconds
        scn.frame_start = 1
        scn.frame_end = max(2, int(seconds * fps))

        ensure_video_settings(scn)

        os.makedirs(bpy.path.abspath(props.output_dir), exist_ok=True)
        base = os.path.join(bpy.path.abspath(props.output_dir), props.exercise_id + "_v1_")

        # Render each aspect
        for aspect, wh in (("square","1080x1080"), ("portrait","1080x1920"), ("landscape","1920x1080")):
            set_resolution(scn, aspect)
            scn.render.filepath = base + f"{wh}.mp4"
            bpy.ops.render.render(animation=True)

        self.report({'INFO'}, "RepCue: Rendered all three aspect ratios.")
        return {'FINISHED'}

class REPCUE_PT_panel(bpy.types.Panel):
    bl_label = "RepCue"
    bl_idname = "REPCUE_PT_panel"
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "output"

    def draw(self, context):
        scn = context.scene
        props = scn.repcue_props
        layout = self.layout

        col = layout.column(align=True)
        col.prop(props, "output_dir")
        col.prop(props, "exercise_id")
        col.prop(props, "is_static")
        if props.is_static:
            col.prop(props, "static_seconds")
        else:
            col.prop(props, "seconds")
        col.prop(props, "is_floor")
        col.operator("repcue.render_triple", icon="RENDER_ANIMATION")

classes = (REPCUE_Props, REPCUE_OT_render, REPCUE_PT_panel)

def register():
    for c in classes:
        bpy.utils.register_class(c)
    bpy.types.Scene.repcue_props = bpy.props.PointerProperty(type=REPCUE_Props)

def unregister():
    for c in reversed(classes):
        bpy.utils.unregister_class(c)
    del bpy.types.Scene.repcue_props

if __name__ == "__main__":
    register()
