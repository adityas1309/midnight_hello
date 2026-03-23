# Asset Options Summary

This document lists the available 3D assets found in the `nature`, `medieval`, and `modular` directories.

## 🌿 Nature
Located at `/assets/nature/glTF/`

### Trees
- **CommonTree**: Versions 1, 2, 3, 4, 5
- **DeadTree**: Versions 1, 2, 3, 4, 5
- **Pine**: Versions 1, 2, 3, 4, 5
- **TwistedTree**: Versions 1, 2, 3, 4, 5

### Plants & Flowers
- **Bushes**: Bush_Common, Bush_Common_Flowers
- **Flowers**: Flower_3 (Group/Single), Flower_4 (Group/Single), Petal (1-5)
- **Grass**: Grass_Common (Short/Tall), Grass_Wispy (Short/Tall)
- **Mushrooms**: Mushroom_Common, Mushroom_Laetiporus
- **Small Plants**: Clover (1, 2), Fern_1, Plant_1 (Regular/Big), Plant_7 (Regular/Big)

### Rocks & Paths
- **Pebbles**: Pebble_Round (1-5), Pebble_Square (1-6)
- **Rocks**: Rock_Medium (1, 2, 3)
- **Path Stones**:
  - **Round**: RockPath_Round_Small (1, 2, 3), RockPath_Round_Thin, RockPath_Round_Wide
  - **Square**: RockPath_Square_Small (1, 2, 3), RockPath_Square_Thin, RockPath_Square_Wide

### Textures
- Bark_DeadTree, Bark_NormalTree, Bark_TwistedTree (Base & Normal)
- Flowers.png, Grass.png, Leaf_Pine (Base & C), Leaves (GiantPine, NormalTree, TwistedTree)
- Mushrooms.png, PathRocks_Diffuse, Rocks_Desert_Diffuse, Rocks_Diffuse

---

## 🏰 Medieval
Located at `/assets/medieval/glTF/`

### Structural Components
- **Walls**: Arch, BottomCover, Plaster (Door Flat/Round/Inset, Straight Base/L/R, Window Thin/Wide), UnevenBrick (Door Flat/Round, Straight, Window Thin/Wide)
- **Floors**: Brick, RedBrick, UnevenBrick, WoodDark (Base, Half, Overhang), WoodLight (Base, Overhang)
- **Roofs**: 
  - **Tiles**: 2x4 RoundTile, Dormer, Modular RoundTiles, RoundTile 2x1 (Base, Long)
  - **Modular RoundTiles**: Huge selection (4x4, 4x6, 4x8, 6x4 to 8x14)
  - **Wooden**: 2x1 (Base, Center, Corner, L, Middle, R)
  - **Supports**: FrontSupports, Support2, Log variant
  - **Tower**: Roof_Tower_RoundTiles
- **Stairs**: 
  - **Exterior**: NoFirstStep, Platform (Base, 45, Clean, U), SidePlatform, Sides (Base, 45, U), SingleSide (Base, Thick), Straight (Base, Center, L, R)
  - **Interior**: Rails, Simple, Solid (Base, Extended)
- **Doors & Frames**:
  - **Doors**: 1, 2, 4, 8 (Flat/Round variants)
  - **Frames**: DoorFrame_Flat (Brick, WoodDark), DoorFrame_Round (Brick, WoodDark)
- **Windows**:
  - **Base**: Thin_Flat1, Thin_Round1, Wide_Flat1, Wide_Round1
  - **Roof Windows**: Window_Roof_Thin, Window_Roof_Wide
  - **Shutters**: Thin/Wide, Flat/Round, Open/Closed variants
- **Balconies**: Cross_Corner, Cross_Straight, Simple_Corner, Simple_Straight
- **Corners**: Exterior (Wide_Brick, Wide_Wood, Brick, TopDown, TopOnly, Wood), Interior (Big, Small)
- **HoleCovers**: 90Angle, 90Half, 90Stairs, Straight, StraightHalf

### Props & Details
- **Fences**: MetalFence (Ornament, Simple), WoodenFence (Single, Extension 1 & 2)
- **Terrain Details**: Prop_Brick (1-4), Prop_Vine (1, 2, 4, 5, 6, 9)
- **Other Props**: Prop_Chimney (1, 2), Prop_Crate, Prop_ExteriorBorder (Corner, Straight 1 & 2), Prop_Support, Prop_Wagon

### Textures
- T_Brick, T_MetalOrnaments, T_Plaster, T_RedBrick, T_RockTrim, T_RoundTiles, T_UnevenBrick, T_VineLeaf, T_WoodTrim

---

## 🎭 Modular Character Parts
Located at `/assets/modular/Modular Parts/`

### Peasant Outfit (Male & Female)
- **Parts**: Arms, Body, Feet, Legs
- **Textures**: T_Peasant (BaseColor, Normal, ORM)

### Ranger Outfit (Male & Female)
- **Parts**: Arms, Body, Feet, Head_Hood, Legs
- **Accessories**: Pauldrons (Male/Female)
- **Textures**: T_Ranger (BaseColor, Normal, ORM)

### Base Character Textures
- **Skin & Basics**: T_Regular_Female/Male (Dark_BaseColor, Normal, Roughness)

---

## 🎬 Character Animations
Found in [UAL1_Standard.glb](file:///c:/Users/singh/Downloads/midnight_hello/ui/public/assets/UAL1_Standard.glb) and [UAL2_Standard.glb](file:///c:/Users/singh/Downloads/midnight_hello/ui/public/assets/UAL2_Standard.glb).

### 🏃 Movement & Agility
- **Walking**: Walk_Loop, Walk_Formal_Loop, Walk_Carry_Loop, Walk_Carry_Loop, Zombie_Walk_Fwd_Loop
- **Running**: Jog_Fwd_Loop, Sprint_Loop, Slide_Loop (Start/Exit)
- **Jumping**: Jump_Start/Loop/Land, NinjaJump_Start/Idle/Land
- **Crouching & Stealth**: Crouch_Fwd_Loop, Crouch_Idle_Loop, Roll, Roll_RM
- **Swimming**: Swim_Fwd_Loop, Swim_Idle_Loop
- **Other**: LayToIdle, ClimbUp_1m_RM

### ⚔️ Combat & Action
- **Melee**: Sword_Attack (Base/RM), Melee_Hook (Base/Rec), Punch_Cross/Jab
- **Sword**: Sword_Idle, Sword_Block, Sword_Dash_RM, Sword_Regular_A/B/C (Base/Rec), Sword_Regular_Combo
- **Shield**: Shield_Dash_RM, Shield_OneShot, Idle_Shield_Break, Idle_Shield_Loop
- **Range**: Pistol_Aim_Down/Neutral/Up, Pistol_Idle_Loop, Pistol_Reload, Pistol_Shoot, OverhandThrow, Spell_Simple_Shoot/Idle/Enter/Exit

### 👷 Utility & Interactions
- **Utility**: Farm_Harvest, Farm_PlantSeed, Farm_Watering, TreeChopping_Loop, Fixing_Kneeling
- **Interactions**: Interact, PickUp_Table, Push_Loop, Chest_Open
- **Vehicles**: Driving_Loop

### 🎭 Social & Misc
- **Idles**: Idle_Loop, Idle_No_Loop, Idle_FoldArms_Loop, Idle_Talking_Loop, Idle_TalkingPhone_Loop, Idle_Torch_Loop, Idle_Lantern_Loop, Idle_Rail_Call/Loop
- **Expressions**: Yes, Dance_Loop, Zombie_Scratch
- **Sitting**: Sitting_Enter/Exit/Idle/Talking
- **Medical/Damage**: Death01, Hit_Chest, Hit_Head, Hit_Knockback (Base/RM)
- **Other**: A_TPose, Consume
