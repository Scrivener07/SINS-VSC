Research is split into two domains, civilian and military.
Each domain is further split into "fields" which are varied between each domain and faction.

Within each field are the research subject nodes which are laid out on a grid with "field coordinates" where the origin grid cell is [0,0] in the upper-left hand side of each tier group.

Looking at the field cell coordinates, there is a further division of "tiers" that start at 0 on the left and ascend moving right.
These tiers are represented as columns in the grid. Each tier occupys 2 columns for grid cells with default settings.

### Research Grid Organization
Domains -> Fields -> Tiers -> Subjects
```
---------------------------------------------------------------------------------
*                               *    Domain-A   *                               *
---------------------------------------------------------------------------------
.................................................................................
*                               *    Field-A    *                               *
*    Tier-0     *    Tier-1     *    Tier-2     *    Tier-3     *    Tier-4     *
| T0.A  | T0.B  | T1.A  | T1.B  | T2.A  | T2.B  | T3.A  | T3.B  | T4.A  | T4.B  |
|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| [0,0] | [1,0] | [2,0] | [3,0] | [4,0] | [5,0] | [6,0] | [7,0] | [8,0] | [9,0] |
| [0,1] | [1,1] | [2,1] | [3,1] | [4,1] | [5,1] | [6,1] | [7,1] | [8,1] | [9,1] |
| [0,2] | [1,2] | [2,2] | [3,2] | [4,2] | [5,2] | [6,2] | [7,2] | [8,2] | [9,2] |
*               *               *               *               *               *
.................................................................................
*                               *    Field-B    *                               *
*    Tier-0     *    Tier-1     *    Tier-2     *    Tier-3     *    Tier-4     *
| T0.A  | T0.B  | T1.A  | T1.B  | T2.A  | T2.B  | T3.A  | T3.B  | T4.A  | T4.B  |
|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| [0,0] | [1,0] | [2,0] | [3,0] | [4,0] | [5,0] | [6,0] | [7,0] | [8,0] | [9,0] |
| [0,1] | [1,1] | [2,1] | [3,1] | [4,1] | [5,1] | [6,1] | [7,1] | [8,1] | [9,1] |
| [0,2] | [1,2] | [2,2] | [3,2] | [4,2] | [5,2] | [6,2] | [7,2] | [8,2] | [9,2] |
*               *               *               *               *               *
.................................................................................
*                               *    Field-C    *                               *
*    Tier-0     *    Tier-1     *    Tier-2     *    Tier-3     *    Tier-4     *
| T0.A  | T0.B  | T1.A  | T1.B  | T2.A  | T2.B  | T3.A  | T3.B  | T4.A  | T4.B  |
|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| [0,0] | [1,0] | [2,0] | [3,0] | [4,0] | [5,0] | [6,0] | [7,0] | [8,0] | [9,0] |
| [0,1] | [1,1] | [2,1] | [3,1] | [4,1] | [5,1] | [6,1] | [7,1] | [8,1] | [9,1] |
| [0,2] | [1,2] | [2,2] | [3,2] | [4,2] | [5,2] | [6,2] | [7,2] | [8,2] | [9,2] |
*               *               *               *               *               *
.................................................................................
```

### Research Grid Dimensions
The grid dimensions are contingent on properties set in the `research.uniforms` file.
```json
{
    "max_tier_count": 5,
    "per_tier_column_count": 2,
}
```
