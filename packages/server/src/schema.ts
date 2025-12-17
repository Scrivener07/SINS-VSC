import * as path from "path";
import { pathToFileURL } from "url";
import { SchemaConfiguration } from "vscode-json-languageservice";

export enum PointerType {
	none,
	brushes,
	textures,
	localized_text,
	beam_effects,
	action_data_sources,
	particle_effects,
	units,
	buffs,
	unit_skins,
	npc_rewards,
	action_value_ids,
	research_subjects,
	abilities,
	unit_items,
	buff_unit_factory_modifiers,
	buff_unit_modifiers
	// TODO: add more...
}

/**
 * Manages JSON schema configurations for the language service.
 */
export class SchemaManager {


	/**
	 * Configures the JSON language service with schemas.
	*/
	public static configure(): SchemaConfiguration[] {
		// Resolve path to the schemas folder.
		const schemasPath = path.join(__dirname, "resources", "schemas");

		// The new or modified schemas folder.
		const schemasPath_dev = path.join(__dirname, "resources", "schemas-dev");

		// The type schema is unknown and requires further investigation.
		const unknown_schema: string = pathToFileURL(path.join(schemasPath_dev, "unknown-schema.json")).toString();

		// Define schema associations.
		//-------------------------

		const schemas_uniforms: SchemaConfiguration[] = [
			// Uniforms have special handling for filename to schema matching.
			{
				fileMatch: ["action.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "action-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["attack_target_type.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "attack-target-type-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["attack_target_type_group.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "attack-target-type-group-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["culture.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "culture-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["debris.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "debris-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["diplomatic_tag.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "diplomatic-tags-schema.json")).toString()
			},
			{
				fileMatch: ["exotic.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "exotic-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["formation.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "formation-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["front_end.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "front-end-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["future_orbit.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "future-orbit-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["galaxy_generator.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "galaxy-generator-uniforms-schema.json")).toString()
			},
			{
				// NOTE: This is an empty JSON object.
				fileMatch: ["game_renderer.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "game-renderer-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["gui.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "gui-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["hud_skin.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "hud-skin-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["loot.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "loot-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["main_view.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "main-view-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["missions.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "mission-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["music.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "music-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["notification.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "notification-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["objective_based_structure.uniforms"],
				uri: unknown_schema
			},
			{
				fileMatch: ["planet.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "planet-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["planet_track.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "planet-track-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["player.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["player_ai.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-ai-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["player_ai_diplomacy.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-ai-diplomacy-schema.json")).toString()
			},
			{
				fileMatch: ["player_color.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-color-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["player_race.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-race-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["random_skybox_filling.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "random-skybox-fillings-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["research.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "research-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["scenario.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "scenario-uniforms-schema.json")).toString()
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
				uri: pathToFileURL(path.join(schemasPath, "special-operation-unit-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["start_mode.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "start-mode-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["strikecraft.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "strikecraft-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["target_filter.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "target-filter-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["tutorial.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "tutorial-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["unit.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["unit_bar.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-bar-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["unit_build.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-build-uniforms-schema.json")).toString()
			},
			{
				// NOTE: Has a runtime patcher.
				fileMatch: ["unit_mutation.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-mutation-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["unit_tag.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-tag-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["user_interface.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "user-interface-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["weapon.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "weapon-uniforms-schema.json")).toString()
			}
		];

		const schemas_entities: SchemaConfiguration[] = [
			{
				fileMatch: ["*.ability"],
				uri: pathToFileURL(path.join(schemasPath, "ability-schema.json")).toString()
			},
			{
				fileMatch: ["*.action_data_source"],
				uri: pathToFileURL(path.join(schemasPath, "action-data-source-schema.json")).toString()
			},
			{
				fileMatch: ["*.buff"],
				uri: pathToFileURL(path.join(schemasPath, "buff-schema.json")).toString()
			},
			{
				fileMatch: ["*.entity_manifest"],
				uri: pathToFileURL(path.join(schemasPath_dev, "entity-manifest-schema.json")).toString()
			},
			{
				fileMatch: ["*.exotic"],
				uri: pathToFileURL(path.join(schemasPath, "exotic-schema.json")).toString()
			},
			{
				fileMatch: ["*.flight_pattern"],
				uri: pathToFileURL(path.join(schemasPath, "flight-pattern-schema.json")).toString()
			},
			{
				fileMatch: ["*.formation"],
				uri: pathToFileURL(path.join(schemasPath, "formation-schema.json")).toString()
			},
			{
				fileMatch: ["*.npc_reward"],
				uri: pathToFileURL(path.join(schemasPath, "npc-reward-schema.json")).toString()
			},
			{
				fileMatch: ["*.player"],
				uri: pathToFileURL(path.join(schemasPath, "player-schema.json")).toString()
			},
			{
				fileMatch: ["*.research_subject"],
				uri: pathToFileURL(path.join(schemasPath, "research-subject-schema.json")).toString()
			},
			{
				fileMatch: ["*.start_mode"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.unit"],
				uri: pathToFileURL(path.join(schemasPath, "unit-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit_item"],
				uri: pathToFileURL(path.join(schemasPath, "unit-item-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit_skin"],
				uri: pathToFileURL(path.join(schemasPath, "unit-skin-schema.json")).toString()
			},
			{
				fileMatch: ["*.weapon"],
				uri: pathToFileURL(path.join(schemasPath, "weapon-schema.json")).toString()
			}
		];

		const schemas_brushes: SchemaConfiguration[] = [
			{
				fileMatch: ["*.brush"],
				uri: pathToFileURL(path.join(schemasPath, "brush-schema.json")).toString()
			}
		];

		const schemas_colors: SchemaConfiguration[] = [
			{
				fileMatch: ["*.named_colors"],
				uri: unknown_schema
			}
		];

		const schemas_cursors: SchemaConfiguration[] = [
			{
				fileMatch: ["*.cursor"],
				uri: unknown_schema
			}
		];

		const schemas_death_sequences: SchemaConfiguration[] = [
			{
				fileMatch: ["*.death_sequence"],
				uri: unknown_schema
			}
		];

		const schemas_effects: SchemaConfiguration[] = [
			{
				fileMatch: ["*.beam_effect"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.exhaust_trail_effect"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.particle_effect"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.shield_effect"],
				uri: unknown_schema
			}
		];

		const schemas_fonts: SchemaConfiguration[] = [
			{
				fileMatch: ["*.font"],
				uri: unknown_schema
			}
		];

		const schemas_gdpr: SchemaConfiguration[] = [
			{
				fileMatch: ["*.gdpr_accept_data"],
				uri: unknown_schema
			}
		];

		const schemas_gravity_well_props: SchemaConfiguration[] = [
			{
				fileMatch: ["*.gravity_well_props"],
				uri: unknown_schema
			}
		];

		const schemas_gui: SchemaConfiguration[] = [
			{
				fileMatch: ["*.gui"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.button_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.drop_box_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.label_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.list_box_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.reflect_box_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.scroll_bar_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.text_entry_box_style"],
				uri: unknown_schema
			}
		];

		const schemas_localized_text: SchemaConfiguration[] = [
			{
				fileMatch: ["*.localized_text"],
				uri: unknown_schema
			}
		];

		const schemas_mesh_materials: SchemaConfiguration[] = [
			{
				fileMatch: ["*.mesh_materials"],
				uri: unknown_schema
			}
		];

		const schemas_player_colors: SchemaConfiguration[] = [
			{
				fileMatch: ["*.player_color_group"],
				uri: unknown_schema
			}
		];

		const schemas_player_icons: SchemaConfiguration[] = [
			{
				fileMatch: ["*.player_icon"],
				uri: unknown_schema
			}
		];

		const schemas_player_portraits: SchemaConfiguration[] = [
			{
				fileMatch: ["*.player_portrait"],
				uri: unknown_schema
			}
		];

		const schemas_scenarios: SchemaConfiguration[] = [
			{
				fileMatch: ["*.scenario"],
				uri: unknown_schema
			}
		];

		const schemas_skyboxes: SchemaConfiguration[] = [
			{
				fileMatch: ["*.skybox"],
				uri: unknown_schema
			}
		];

		const schemas_sounds: SchemaConfiguration[] = [
			{
				fileMatch: ["*.sound"],
				uri: unknown_schema
			}
		];

		const schemas_texture_animations: SchemaConfiguration[] = [
			{
				fileMatch: ["*.texture_animation"],
				uri: unknown_schema
			}
		];

		const schemas_welcome: SchemaConfiguration[] = [
			{
				fileMatch: ["*.welcome_message"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.playtime_message"],
				uri: unknown_schema
			}
		];

		const schemas_mod: SchemaConfiguration[] = [
			{
				fileMatch: [".mod_meta_data"],
				uri: unknown_schema
			},
			{
				fileMatch: ["settings_override.json"],
				uri: unknown_schema
			}
		];

		const schemas: SchemaConfiguration[] = [
			...schemas_uniforms,
			...schemas_entities,
			...schemas_brushes,
			...schemas_colors,
			...schemas_cursors,
			...schemas_death_sequences,
			...schemas_effects,
			...schemas_fonts,
			...schemas_gdpr,
			...schemas_gravity_well_props,
			...schemas_gui,
			...schemas_localized_text,
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
