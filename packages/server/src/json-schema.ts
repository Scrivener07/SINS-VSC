/**
 * The game data is the "source of truth". If the game runs with a file, the schema is wrong, not the file.
 * Several vanilla game files to not conform to the provided JSON schemas.
 *
 * The schemas should be updated to avoid hitting users with "fake" errors about their data.
 * But we should also avoid modifying the official schemas directly which makes updating them later hard.
 *
 * This code modifies the schema in memory before the Language Service sees it by injecting changes at runtime.
 */

import { PointerType } from "./schema";


/**
 * A function that modifies a schema object in place.
 */
type PatchFunction = (schema: any) => void;


/**
 * Manages runtime patches for JSON schemas.
 */
export class SchemaPatcher {

	/** Maps a JSON schema file name to a patching function. */
	private patches: Map<string, PatchFunction>;


	constructor() {
		this.patches = new Map();
		this.register("unit-schema.json", SchemaPatch.unit);
		this.register("weapon-schema.json", SchemaPatch.weapon);
		this.register("galaxy-generator-uniforms-schema.json", SchemaPatch.galaxy_generator_uniforms);
		this.register("gui-uniforms-schema.json", SchemaPatch.gui_uniforms);
		this.register("loot-uniforms-schema.json", SchemaPatch.loot_uniforms);
		this.register("main-view-uniforms-schema.json", SchemaPatch.main_view_uniforms);
		this.register("mission-uniforms-schema.json", SchemaPatch.mission_uniforms);
		this.register("player-ai-diplomacy-schema.json", SchemaPatch.player_ai_diplomacy_uniforms);
		this.register("scenario-uniforms-schema.json", SchemaPatch.scenario_uniforms);
		this.register("unit-uniforms-schema.json", SchemaPatch.unit_uniforms);
		this.register("unit-mutation-uniforms-schema.json", SchemaPatch.unit_mutation_uniforms);
	}


	/**
	 * Registers a patch function for a specific schema file.
	 */
	private register(fileName: string, patch: PatchFunction): void {
		this.patches.set(fileName, patch);
	}

	public applyPointers(schema: any): void {
		let defs: any = schema.$defs;
		if (!defs) {
			defs = schema.$defs = {};
		}
		defs.localized_text_ptr = { ...defs.localized_text_ptr, pointer: PointerType.localized_text};
		defs.file_texture_ptr = { ...defs.file_texture_ptr, pointer: PointerType.textures};
		defs.unit_skin_definition_ptr = { ...defs.unit_skin_definition_ptr, pointer: PointerType.unit_skins};
		defs.npc_reward_definition_ptr = { ...defs.npc_reward_definition_ptr, pointer: PointerType.npc_rewards};
		defs.particle_effect_definition_ptr = { ...defs.particle_effect_definition_ptr, pointer: PointerType.particle_effects};
		defs.beam_effect_definition_ptr = { ...defs.beam_effect_definition_ptr, pointer: PointerType.beam_effects};
		defs.action_data_source_definition_ptr = { ...defs.action_data_source_definition_ptr, pointer: PointerType.action_data_sources};
		defs.brush_ptr = { ...defs.brush_ptr, pointer: PointerType.brushes};
		defs.unit_definition_ptr = {...defs.unit_definition_ptr, pointer: PointerType.units};
		defs.buff_definition_ptr = {...defs.buff_definition_ptr, pointer: PointerType.buffs};
		defs.action_value_id = {...defs.action_value_id, pointer: PointerType.action_value_ids};
		defs.research_subject_definition_ptr = {...defs.research_subject_definition_ptr, pointer: PointerType.research_subjects};
		defs.ability_definition_ptr = {...defs.ability_definition_ptr, pointer: PointerType.abilities};
		defs.unit_item_definition_ptr = {...defs.unit_item_definition_ptr, pointer: PointerType.unit_items};
		defs.buff_unit_factory_modifier_id = {...defs.buff_unit_factory_modifier_id, pointer: PointerType.buff_unit_factory_modifiers};
		defs.buff_unit_modifier_id = {...defs.buff_unit_modifier_id, pointer: PointerType.buff_unit_modifiers};
		// TODO: add more...
	}

	/**
	 * Applies a registered patch to the given schema object if one exists.
	 * @returns The modified schema object or the original if no patch exists.
	 */
	public apply(fileName: string, schema: any): any {
		const patch: PatchFunction | undefined = this.patches.get(fileName);
		if (patch) {
			patch(schema);
		}
		return schema;
	}


}


class SchemaPatch {

	public static unit(schema: any): void {
		const defs: any = schema.$defs;
		defs.unit_skin_definition_group.items.properties.skins = { ...defs.unit_skin_definition_group.items.properties.skins, pointer: PointerType.unit_skins, uniqueItems: true};
	}


	/**
	 * A runtime patcher for the `weapon.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - "name" property is not tagged as a pointer...
	 *
	 * @param schema The schema object data to use.
	 */

	public static weapon(schema: any): void {
		const props: any = schema.properties;
		props.name = {...props.name, pointer: PointerType.localized_text };
	}

	/**
	 * A runtime patcher for the `galaxy-generator-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property fillings is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static galaxy_generator_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["fillings"] = { type: "object" };
	}


	/**
	 * A runtime patcher for the `gui-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property unmet_target_gravity_well_must_have_unit_type_constraint is not allowed.
	 * - Property target_filter_unit_type_names is not allowed.
	 * - Property inline_icons is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static gui_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["inline_icons"] = { type: "array" };
		const query_status = schema.properties["query_status"];
		if (query_status.properties) {
			query_status.properties["unmet_target_gravity_well_must_have_unit_type_constraint"] = { type: "string" };
			query_status.properties["target_filter_unit_type_names"] = { type: "object" };
		}
	}


	/**
	 * A runtime patcher for the `loot-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property weight is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static loot_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		const random_loots = schema.properties["random_loots"];
		if (random_loots) {
			random_loots.items.properties["weight"] = { type: "integer" };
		}
	}


	/**
	 * A runtime patcher for the `main-view-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property groups is not allowed.
	 * - Property social_system is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static main_view_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		const unit_icons = schema.properties["unit_icons"];
		if (unit_icons) {
			unit_icons.properties["groups"] = { type: "array" };
		}
		schema.properties["social_system"] = { type: "object" };
	}


	/**
	 * A runtime patcher for the `mission-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property trigger_tooltip_desc_override is not allowed.
	 * - Property trigger_hud_definition is not allowed.
	 * - Property trigger_hud_icon_structure_override is not allowed.
	 * - Property build_structure_tooltip_desc_override is not allowed.
	 * - Property build_structure_tooltip_title_override is not allowed.
	 * - Property hyperspace_time is not allowed.
	 * - Property chains is not allowed.
	 * - Property reward_hud_definition is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static mission_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["build_structure_tooltip_title_override"] = { type: "string" };
		schema.properties["build_structure_tooltip_desc_override"] = { type: "string" };
		schema.properties["trigger_hud_icon_structure_override"] = { type: "string" };
		schema.properties["trigger_hud_definition"] = { type: "object" };
		schema.properties["reward_hud_definition"] = { type: "object" };
		try {
			const main_mission_chains = schema.properties["main_mission_chains"];
			if (main_mission_chains?.items?.properties) {

				let chains: any = undefined; // copy to side-operations

				const operation_chains = main_mission_chains.items.properties["operation_chains"];
				if (operation_chains?.items?.properties) {

					chains = operation_chains.items.properties["chains"];
					if (chains?.items?.properties) {

						// Triggers
						const trigger = chains.items.properties["trigger"];
						if (trigger?.items?.properties) {
							trigger.items.properties["trigger_tooltip_desc_override"] = { type: "string" };
						}

						// Rewards
						const reward = chains.items.properties["reward"];
						if (reward?.items?.properties) {
							const spawn_unit_reward = reward.items.properties["spawn_unit_reward"];
							if (spawn_unit_reward?.properties) {
								spawn_unit_reward.properties["hyperspace_time"] = { type: "number" };
							}
						}

					}
				}

				const side_operations = main_mission_chains.items.properties["side_operations"];
				if (side_operations?.properties) {
					side_operations.properties["chains"] = chains;
				}

			}
		} catch (error) {
			console.error("Failed to patch the mission uniform schema type.", error);
		}
	}


	/**
	 * A runtime patcher for the `player-ai-diplomacy-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property passive_hate_per_factional_victory_obtained is not allowed.
	 * - Property minutes_allowed_for_trade_offer_cooldown is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static player_ai_diplomacy_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["passive_hate_per_factional_victory_obtained"] = { type: "number" };
		schema.properties["minutes_allowed_for_trade_offer_cooldown"] = {
			type: "array",
			items: {
				type: "number"
			}
		};
	}


	/**
	 * A runtime patcher for the `scenario-uniforms-schema..json` schema type.
	 *
	 * Vanilla file has problems. (`dlc_scenarios` and `dlc_multiplayer_scenarios`)
	 * - Property scenarios is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static scenario_uniforms(schema: any): void {
		schema.properties = schema.properties || {};

		const dlc_scenarios = schema.properties["dlc_scenarios"];
		dlc_scenarios.items.properties["scenarios"] = {
			type: "array",
			items: {
				type: "string"
			}
		};

		const dlc_multiplayer_scenarios = schema.properties["dlc_multiplayer_scenarios"];
		dlc_multiplayer_scenarios.items.properties["scenarios"] = {
			type: "array",
			items: {
				type: "string"
			}
		};
	}


	/**
	 * A runtime patcher for the `unit-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property raw_distance_per_gravity_well_distance is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static unit_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["raw_distance_per_gravity_well_distance"] = { type: "number" };
	}


	/**
	 * A runtime patcher for the `unit-mutation-uniforms-schema.json` schema type.
	 *
	 * Vanilla file has problems.
	 * - Property can_use_weapons is not allowed.
	 * - Property can_use_missile_weapons is not allowed.
	 * - Property can_update_weapon_cooldown_progress is not allowed.
	 * - Property can_use_weapons_when_crippled is not allowed.
	 * - Property can_hyperspace is not allowed.
	 * - Property can_be_targeted_by_allies is not allowed.
	 * - Property can_be_targeted_by_enemies is not allowed.
	 * - Property can_be_damaged is not allowed.
	 * - Property can_planet_be_damaged is not allowed.
	 * - Property can_planet_update_track_upgrade_progress is not allowed.
	 * - Property can_have_hull_restored is not allowed.
	 * - Property can_have_armor_restored is not allowed.
	 * - Property can_have_shields_bypassed is not allowed.
	 * - Property can_have_shields_restored is not allowed.
	 * - Property can_have_shields_burst_restored is not allowed.
	 * - Property can_passively_regenerate_hull is not allowed.
	 * - Property can_passively_regenerate_armor is not allowed.
	 * - Property can_passively_regenerate_shields is not allowed.
	 * - Property can_use_active_abilities is not allowed.
	 * - Property can_use_abilities_when_crippled is not allowed.
	 * - Property can_update_ability_cooldown_progress is not allowed.
	 * - Property can_update_build_progress is not allowed.
	 * - Property can_be_colonized is not allowed.
	 * - Property can_launch_or_dock_strikecraft is not allowed.
	 * - Property can_have_any_strikecraft_launched is not allowed.
	 * - Property can_update_unit_production is not allowed.
	 * - Property can_create_retargeting_torpedoes is not allowed.
	 * - Property can_update_unit_item_build_progress is not allowed.
	 *
	 * @param schema The schema object data to use.
	 */
	public static unit_mutation_uniforms(schema: any): void {
		schema.properties = schema.properties || {};

		const permission_infos = schema.properties["permission_infos"];
		permission_infos.properties["can_use_weapons"] = { type: "object" };
		permission_infos.properties["can_use_missile_weapons"] = { type: "object" };
		permission_infos.properties["can_update_weapon_cooldown_progress"] = { type: "object" };
		permission_infos.properties["can_use_weapons_when_crippled"] = { type: "object" };
		permission_infos.properties["can_hyperspace"] = { type: "object" };
		permission_infos.properties["can_be_targeted_by_allies"] = { type: "object" };
		permission_infos.properties["can_be_targeted_by_enemies"] = { type: "object" };
		permission_infos.properties["can_be_targeted_by_enemies"] = { type: "object" };
		permission_infos.properties["can_be_damaged"] = { type: "object" };
		permission_infos.properties["can_planet_be_damaged"] = { type: "object" };
		permission_infos.properties["can_planet_update_track_upgrade_progress"] = { type: "object" };
		permission_infos.properties["can_have_hull_restored"] = { type: "object" };
		permission_infos.properties["can_have_armor_restored"] = { type: "object" };
		permission_infos.properties["can_have_shields_bypassed"] = { type: "object" };
		permission_infos.properties["can_have_shields_restored"] = { type: "object" };
		permission_infos.properties["can_have_shields_burst_restored"] = { type: "object" };
		permission_infos.properties["can_passively_regenerate_hull"] = { type: "object" };
		permission_infos.properties["can_passively_regenerate_armor"] = { type: "object" };
		permission_infos.properties["can_passively_regenerate_shields"] = { type: "object" };
		permission_infos.properties["can_use_active_abilities"] = { type: "object" };
		permission_infos.properties["can_use_abilities_when_crippled"] = { type: "object" };
		permission_infos.properties["can_update_ability_cooldown_progress"] = { type: "object" };
		permission_infos.properties["can_update_build_progress"] = { type: "object" };
		permission_infos.properties["can_be_colonized"] = { type: "object" };
		permission_infos.properties["can_launch_or_dock_strikecraft"] = { type: "object" };
		permission_infos.properties["can_have_any_strikecraft_launched"] = { type: "object" };
		permission_infos.properties["can_update_unit_production"] = { type: "object" };
		permission_infos.properties["can_create_retargeting_torpedoes"] = { type: "object" };
		permission_infos.properties["can_update_unit_item_build_progress"] = { type: "object" };
	}


}
