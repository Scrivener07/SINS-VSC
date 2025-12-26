/*
This file is WIP and unused currently.
It is intended to define the structure of player research data.
*/

export interface Research {
    research_domains: ResearchDomains;
    research_subjects: string[];
    faction_research_subjects: string[];
}

export interface ResearchDomains {
    civilian: ResearchDomain;
    military: ResearchDomain;
}

export interface ResearchDomain {
    full_name: string;
    partial_name: string;
    partial_name_uppercase: string;
    research_points_name: string;
    research_points_per_population_name: string;
    research_rate_name: string;
    research_rate_per_population_name: string;
    hud_icon: string;
    button_background: string;
    compressed_research_field_picture: string;
    research_tiers: ResearchTier[];
    research_fields: ResearchField[];
}

export interface ResearchTier {
    acquire_time: number;
    required_research_points: number;
    price: Price;
    button_background: string;
    player_modifiers: PlayerModifiers;
}

export interface ResearchField {
    id: string;
    name: string;
    picture: string;
}

export interface Price {
    crystal: number | undefined;
    credits: number | undefined;
    metal: number | undefined;
}

export interface PlayerModifiers {
    empire_modifiers: Modifier[] | undefined;
    planet_modifiers: Modifier[] | undefined;
}

export interface Modifier {
    value_behavior: string;
    modifier_type: string;
    value: number;
}
