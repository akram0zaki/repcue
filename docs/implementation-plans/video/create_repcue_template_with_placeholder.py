
# create_repcue_template_with_placeholder.py
# Run this inside Blender: Scripting > New > Paste > Run Script.
# Then save as: repcue_template.blend

import bpy
import math

# ----- Reset -----
bpy.ops.wm.read_factory_settings(use_empty=True)

# ----- Scene / World -----
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.frame_rate = 30

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.1, 0.1, 0.1, 1.0)
bg.inputs[1].default_value = 1.0

# ----- Ground -----
bpy.ops.mesh.primitive_plane_add(size=20, location=(0,0,0))
ground = bpy.context.active_object
ground.name = "Ground"
mat = bpy.data.materials.new("GroundMat")
mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12,0.12,0.12,1.0)
ground.data.materials.append(mat)

# ----- Camera -----
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

def position_camera(kind="standing"):
    if kind == "floor":
        cam_obj.location = (0.0, -3.2, 1.0)
    else:
        cam_obj.location = (0.0, -4.2, 1.5)
    cam_obj.rotation_euler = (math.radians(80), 0, 0)  # slight down-tilt

position_camera("standing")

# ----- Lights -----
def add_area(name, loc, rot, power=1200, size=5):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
    L = bpy.context.active_object
    L.name = name
    L.data.energy = power
    L.data.shape = 'RECTANGLE'
    L.data.size = size
    L.data.size_y = size
    return L

add_area("Key", (3,-3,3), (math.radians(-35),0,math.radians(35)), power=1500, size=5)
add_area("Fill", (-3,-3,2.5), (math.radians(-25),0,math.radians(-35)), power=800, size=5)
add_area("Rim", (0,3,2.5), (math.radians(-160),0,0), power=600, size=3)

# ----- Placeholder Humanoid (Armature + simple mesh) -----
# Armature
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm = bpy.context.active_object
arm.name = "PlaceholderRig"
arm.show_in_front = True  # X-ray view

# Build a very simple 3-bone chain: hips -> chest -> head
eb = arm.data.edit_bones
root = eb[0]
root.name = "Hips"
root.head = (0,0,0.95)
root.tail = (0,0,1.15)

chest = eb.new("Chest")
chest.head = root.tail
chest.tail = (0,0,1.45)
chest.parent = root

head = eb.new("Head")
head.head = chest.tail
head.tail = (0,0,1.65)
head.parent = chest

# Simple legs (one bone each)
l_leg = eb.new("L_Leg")
l_leg.head = (0.1,0,0.95)
l_leg.tail = (0.1,0,0.3)
l_leg.parent = root

r_leg = eb.new("R_Leg")
r_leg.head = (-0.1,0,0.95)
r_leg.tail = (-0.1,0,0.3)
r_leg.parent = root

# Simple arms (one bone each)
l_arm = eb.new("L_Arm")
l_arm.head = (0.15,0,1.35)
l_arm.tail = (0.5,0,1.25)
l_arm.parent = chest

r_arm = eb.new("R_Arm")
r_arm.head = (-0.15,0,1.35)
r_arm.tail = (-0.5,0,1.25)
r_arm.parent = chest

bpy.ops.object.mode_set(mode='OBJECT')

# Add a simple capsule-like mesh for the body (for lighting tests)
bpy.ops.mesh.primitive_uv_sphere_add(location=(0,0,1.1), scale=(0.18,0.18,0.28))
body = bpy.context.active_object
mat_body = bpy.data.materials.new("BodyMat")
mat_body.use_nodes = True
mat_body.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8,0.8,0.82,1.0)
body.data.materials.append(mat_body)

# Parent mesh to armature with automatic weights (approximate)
mod = body.modifiers.new("Armature", type='ARMATURE')
mod.object = arm

# ----- Looping animation on the rig -----
# Create an Action called "Loop" that simulates a gentle squat-like movement
scene.frame_start = 1
scene.frame_end = 66  # 2.2s @ 30 fps

arm.animation_data_create()
act = bpy.data.actions.new("Loop")
arm.animation_data.action = act

# Animate hips Z (down and up)
fcu_loc_z = act.fcurves.new(data_path="location", index=2)
k = fcu_loc_z.keyframe_points
k.add(3)
k[0].co = (scene.frame_start, 0.0)
k[1].co = ((scene.frame_start + scene.frame_end)//2, -0.1)   # dip
k[2].co = (scene.frame_end, 0.0)
for kp in k:
    kp.interpolation = 'BEZIER'

# Tiny chest rotation for natural feel
arm.rotation_mode = 'XYZ'
fcu_rot_x = act.fcurves.new(data_path="rotation_euler", index=0)
k2 = fcu_rot_x.keyframe_points
k2.add(3)
k2[0].co = (scene.frame_start, math.radians(0.0))
k2[1].co = ((scene.frame_start + scene.frame_end)//2, math.radians(4.0))
k2[2].co = (scene.frame_end, math.radians(0.0))
for kp in k2:
    kp.interpolation = 'BEZIER'

# Match mesh movement to armature object (for preview only)
# (Mesh is not skinned; we keep it simple for a lighting/camera test object.)
body.parent = arm

# ----- Output defaults -----
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'LOW'
scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
scene.render.ffmpeg.gopsize = scene.frame_rate

print("Template with placeholder created. Save as repcue_template.blend")
