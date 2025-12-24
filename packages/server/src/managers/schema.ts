import * as path from "path";
import * as fs from "fs";
import { JSONSchema, SchemaConfiguration } from "vscode-json-languageservice";
import { pathToFileURL } from "url";
import {
    Weapon,
    UnitSkin,
    Unit,
    Ability,
    Exotic,
    ActionDataSource,
    Buff,
    GalaxyGenerator,
    Player,
    ResearchSubject,
    UnitItem,
    FlightPattern,
    LocalizedText,
    Formation,
    NpcReward,
    StartMode,
    EntityManifest,
    NamedColors,
    Font
} from "../entities/index";
import { PointerType } from "../pointers";

interface IEntityFunction {
    config: SchemaConfiguration;
    patch(pointer?: PointerType): SchemaConfiguration;
}

interface IEntity {
    new (schemaManager: SchemaManager): IEntityFunction;
}

export class SinsEntities {
    public static entities: IEntity[] = [
        Unit,
        Weapon,
        UnitSkin,
        Ability,
        Buff,
        ActionDataSource,
        Exotic,
        Player,
        ResearchSubject,
        UnitItem,
        FlightPattern,
        Formation,
        NpcReward,
        StartMode
    ];

    public static colors: IEntity[] = [NamedColors];
    public static fonts: IEntity[] = [Font];
    public static uniforms: IEntity[] = [GalaxyGenerator];
    public static localized_text: IEntity[] = [LocalizedText];

    public static all: IEntity[] = [
        ...SinsEntities.entities,
        ...SinsEntities.uniforms,
        ...SinsEntities.colors,
        ...SinsEntities.fonts,
        ...SinsEntities.localized_text,
        EntityManifest
    ];
}

/**
 * Manages JSON schema configurations for the language service.
 */
export class SchemaManager {
    private configurations: SchemaConfiguration[] = [];
    /**
     * Configures the JSON language service with schemas.
     */
    public schemasPath: string = path.join(__dirname, "resources", "schemas");
    public schemasPath_dev: string = path.join(__dirname, "resources", "schemas-dev");
    public unknown_schema: string = path.join(this.schemasPath_dev, "unknown-schema.json");

    public parseSchema(...uri: string[]): JSONSchema {
        const content: string = fs.readFileSync(path.join(...uri), "utf-8");
        if (content) {
            const schema: any = JSON.parse(content);
            return schema;
        }
        return JSON.parse(fs.readFileSync(this.unknown_schema, "utf-8"));
    }

    public configure(): SchemaConfiguration[] {
        this.configurations.length = 0;
        for (const entity of SinsEntities.all) {
            const _entity = new entity(this);

            // clone the manifest schema and assign an unique pointer for each.
            if (_entity.constructor.name === EntityManifest.name) {
                for (const manifest of [
                    PointerType.weapon,
                    PointerType.unit_skin,
                    PointerType.unit_item,
                    PointerType.unit,
                    PointerType.start_mode,
                    PointerType.research_subject,
                    PointerType.player,
                    PointerType.npc_reward,
                    PointerType.formation,
                    PointerType.flight_pattern,
                    PointerType.exotic,
                    PointerType.buff,
                    PointerType.action_data_source,
                    PointerType.ability
                ]) {
                    const tmp = new entity(this);
                    tmp.config.fileMatch = [PointerType[manifest] + ".entity_manifest"];
                    this.configurations.push(tmp.patch(manifest));
                }
                continue;
            }
            const _patched = _entity.patch();
            this.patchPointers(_patched.schema);
            this.configurations.push(_patched);
        }
        return this.configurations;
    }

    public patchPointers(schema: any): void {
        let defs: any = schema.$defs;
        if (!defs) {
            defs = schema.$defs = {};
        }

        defs.death_sequence_group_definition_ptr = { ...defs.death_sequence_group_definition_ptr, pointer: PointerType.death_sequence_group };
        defs.mesh_material_ptr = { ...defs.mesh_material_ptr, pointer: PointerType.mesh_material };
        defs.exotic_type = { ...defs.exotic_type, pointer: PointerType.exotic };
        defs.special_operation_unit_kind = { ...defs.special_operation_unit_kind, pointer: PointerType.special_operation_unit_kind };
        defs.mesh_ptr = { ...defs.mesh_ptr, pointer: PointerType.mesh };
        defs.gravity_well_props_definition_ptr = { ...defs.gravity_well_props_definition_ptr, pointer: PointerType.gravity_well_props };
        defs.localized_text_ptr = { ...defs.localized_text_ptr, pointer: PointerType.localized_text };
        defs.file_texture_ptr = { ...defs.file_texture_ptr, pointer: PointerType.texture };
        defs.unit_skin_definition_ptr = { ...defs.unit_skin_definition_ptr, pointer: PointerType.unit_skin };
        defs.npc_reward_definition_ptr = { ...defs.npc_reward_definition_ptr, pointer: PointerType.npc_reward };
        defs.particle_effect_definition_ptr = { ...defs.particle_effect_definition_ptr, pointer: PointerType.particle_effect };
        defs.beam_effect_definition_ptr = { ...defs.beam_effect_definition_ptr, pointer: PointerType.beam_effect };
        defs.action_data_source_definition_ptr = { ...defs.action_data_source_definition_ptr, pointer: PointerType.action_data_source };
        defs.brush_ptr = { ...defs.brush_ptr, pointer: PointerType.brush };
        defs.unit_definition_ptr = { ...defs.unit_definition_ptr, pointer: PointerType.unit };
        defs.buff_definition_ptr = { ...defs.buff_definition_ptr, pointer: PointerType.buff };
        defs.action_value_id = { ...defs.action_value_id, pointer: PointerType.action_value_id };
        defs.research_subject_definition_ptr = { ...defs.research_subject_definition_ptr, pointer: PointerType.research_subject };
        defs.ability_definition_ptr = { ...defs.ability_definition_ptr, pointer: PointerType.ability };
        defs.unit_item_definition_ptr = { ...defs.unit_item_definition_ptr, pointer: PointerType.unit_item };
        defs.buff_unit_factory_modifier_id = { ...defs.buff_unit_factory_modifier_id, pointer: PointerType.buff_unit_factory_modifier };
        defs.buff_unit_modifier_id = { ...defs.buff_unit_modifier_id, pointer: PointerType.buff_unit_modifier };
        // TODO: add more...
    }

    public TEMPORARY_DELETE_WHEN_DONE_PARSING_THROUGH_THESE(): SchemaConfiguration[] {

        const schemas_uniforms: SchemaConfiguration[] = [
            // Uniforms have special handling for filename to schema matching.
            {
                fileMatch: ["action.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "action-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["attack_target_type.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "attack-target-type-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["attack_target_type_group.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "attack-target-type-group-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["culture.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "culture-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["debris.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "debris-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["diplomatic_tag.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "diplomatic-tags-schema.json")).toString()
            },
            {
                fileMatch: ["exotic.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "exotic-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["formation.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "formation-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["front_end.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "front-end-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["future_orbit.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "future-orbit-uniforms-schema.json")).toString()
            },

            {
                // NOTE: This is an empty JSON object.
                fileMatch: ["game_renderer.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "game-renderer-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["gui.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "gui-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["hud_skin.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "hud-skin-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["loot.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "loot-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["main_view.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "main-view-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["missions.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "mission-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["music.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "music-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["notification.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "notification-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["objective_based_structure.uniforms"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["planet.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "planet-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["planet_track.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "planet-track-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["player.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "player-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["player_ai.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "player-ai-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["player_ai_diplomacy.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "player-ai-diplomacy-schema.json")).toString()
            },
            {
                fileMatch: ["player_color.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "player-color-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["player_race.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "player-race-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["random_skybox_filling.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "random-skybox-fillings-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["research.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "research-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["scenario.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "scenario-uniforms-schema.json")).toString()
            },
            {
                /**
                 * Using `special-operation-unit-uniforms-schema.json` as the schema type.
                 *
                 *
                 * NOTE: This has TWO schemas that need to be investigated.
                 * - `special-operation-unit-uniforms-schema.json`   <--- using this one
                 * - `special_operation_unit_uniforms-schema.json`
                 *
                 * The `special-operation-unit-uniforms-schema.json` has two new fields compared to the other.
                 * - `overwrite_special_operation_unit_kinds`
                 * - `will_ignore_planet_slot_costs`
                 */
                fileMatch: ["special_operation_unit.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "special-operation-unit-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["start_mode.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "start-mode-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["strikecraft.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "strikecraft-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["target_filter.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "target-filter-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["tutorial.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "tutorial-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["unit.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "unit-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["unit_bar.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "unit-bar-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["unit_build.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "unit-build-uniforms-schema.json")).toString()
            },
            {
                // NOTE: Has a runtime patcher.
                fileMatch: ["unit_mutation.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "unit-mutation-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["unit_tag.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "unit-tag-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["user_interface.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "user-interface-uniforms-schema.json")).toString()
            },
            {
                fileMatch: ["weapon.uniforms"],
                uri: pathToFileURL(path.join(this.schemasPath, "weapon-uniforms-schema.json")).toString()
            }
        ];

        const schemas_brushes: SchemaConfiguration[] = [
            {
                fileMatch: ["*.brush"],
                uri: pathToFileURL(path.join(this.schemasPath, "brush-schema.json")).toString()
            }
        ];

        const schemas_cursors: SchemaConfiguration[] = [
            {
                fileMatch: ["*.cursor"],
                uri: this.unknown_schema
            }
        ];

        const schemas_death_sequences: SchemaConfiguration[] = [
            {
                fileMatch: ["*.death_sequence"],
                uri: this.unknown_schema
            }
        ];

        const schemas_effects: SchemaConfiguration[] = [
            {
                fileMatch: ["*.beam_effect"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.exhaust_trail_effect"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.particle_effect"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.shield_effect"],
                uri: this.unknown_schema
            }
        ];

        const schemas_fonts: SchemaConfiguration[] = [
            {
                fileMatch: ["*.font"],
                uri: this.unknown_schema
            }
        ];

        const schemas_gdpr: SchemaConfiguration[] = [
            {
                fileMatch: ["*.gdpr_accept_data"],
                uri: this.unknown_schema
            }
        ];

        const schemas_gravity_well_props: SchemaConfiguration[] = [
            {
                fileMatch: ["*.gravity_well_props"],
                uri: this.unknown_schema
            }
        ];

        const schemas_gui: SchemaConfiguration[] = [
            {
                fileMatch: ["*.gui"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.button_style"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.drop_box_style"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.label_style"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.list_box_style"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.reflect_box_style"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.scroll_bar_style"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.text_entry_box_style"],
                uri: this.unknown_schema
            }
        ];

        const schemas_mesh_materials: SchemaConfiguration[] = [
            {
                fileMatch: ["*.mesh_materials"],
                uri: this.unknown_schema
            }
        ];

        const schemas_player_colors: SchemaConfiguration[] = [
            {
                fileMatch: ["*.player_color_group"],
                uri: this.unknown_schema
            }
        ];

        const schemas_player_icons: SchemaConfiguration[] = [
            {
                fileMatch: ["*.player_icon"],
                uri: this.unknown_schema
            }
        ];

        const schemas_player_portraits: SchemaConfiguration[] = [
            {
                fileMatch: ["*.player_portrait"],
                uri: this.unknown_schema
            }
        ];

        const schemas_scenarios: SchemaConfiguration[] = [
            {
                fileMatch: ["*.scenario"],
                uri: this.unknown_schema
            }
        ];

        const schemas_skyboxes: SchemaConfiguration[] = [
            {
                fileMatch: ["*.skybox"],
                uri: this.unknown_schema
            }
        ];

        const schemas_sounds: SchemaConfiguration[] = [
            {
                fileMatch: ["*.sound"],
                uri: this.unknown_schema
            }
        ];

        const schemas_texture_animations: SchemaConfiguration[] = [
            {
                fileMatch: ["*.texture_animation"],
                uri: this.unknown_schema
            }
        ];

        const schemas_welcome: SchemaConfiguration[] = [
            {
                fileMatch: ["*.welcome_message"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["*.playtime_message"],
                uri: this.unknown_schema
            }
        ];

        const schemas_mod: SchemaConfiguration[] = [
            {
                fileMatch: [".mod_meta_data"],
                uri: this.unknown_schema
            },
            {
                fileMatch: ["settings_override.json"],
                uri: this.unknown_schema
            }
        ];

        const schemas: SchemaConfiguration[] = [
            ...schemas_uniforms,
            ...schemas_brushes,
            ...schemas_cursors,
            ...schemas_death_sequences,
            ...schemas_effects,
            ...schemas_fonts,
            ...schemas_gdpr,
            ...schemas_gravity_well_props,
            ...schemas_gui,
            ...schemas_mesh_materials,
            ...schemas_player_colors,
            ...schemas_player_icons,
            ...schemas_player_portraits,
            ...schemas_scenarios,
            ...schemas_skyboxes,
            ...schemas_sounds,
            ...schemas_texture_animations,
            ...schemas_welcome,
            ...schemas_mod
        ];

        return schemas;
    }
}
