// Form options for pit & match scouting

export const DRIVETRAIN_OPTIONS = [
  { value: "swerve", label: "Swerve" },
  { value: "tank", label: "Tank" },
  { value: "west_coast", label: "West Coast" },
  { value: "other", label: "Diğer" },
] as const;

export const ROBOT_TYPE_OPTIONS = [
  { value: "kitbot", label: "Kitbot" },
  { value: "custom", label: "Özel" },
] as const;

export const INTAKE_OPTIONS = [
  { value: "floor", label: "Floor" },
  { value: "human_player", label: "Human Player" },
] as const;

export const SHOOTER_OPTIONS = [
  { value: "flywheel", label: "Flywheel" },
  { value: "roller", label: "Roller" },
  { value: "other", label: "Diğer" },
] as const;

export const CLIMB_CAPABILITY_OPTIONS = [
  { value: "none", label: "Yok" },
  { value: "low", label: "Düşük" },
  { value: "high", label: "Yüksek" },
] as const;

export const RATING_1_5 = [1, 2, 3, 4, 5] as const;

export const CLIMB_TYPE_OPTIONS = [
  { value: "traversal", label: "Traversal" },
  { value: "high", label: "High" },
  { value: "mid", label: "Mid" },
  { value: "low", label: "Low" },
  { value: "none", label: "Yok" },
  { value: "other", label: "Diğer" },
] as const;

export const MATCH_TYPE_OPTIONS = [
  { value: "qual", label: "Qual" },
  { value: "playoff", label: "Playoff" },
] as const;
