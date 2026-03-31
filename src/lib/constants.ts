// Form options for pit & match scouting

export const DRIVETRAIN_OPTIONS = [
  { value: "swerve", label: "Swerve" },
  { value: "tank", label: "Tank" },
  { value: "mecanum_drive", label: "Mecanum Drive" },
  { value: "other", label: "Diğer" },
] as const;

export const ROBOT_TYPE_OPTIONS = [
  { value: "kitbot", label: "Kitbot" },
  { value: "custom", label: "Özel" },
] as const;

export const INTAKE_OPTIONS = [
  { value: "", label: "Yok" },
  { value: "other", label: "Özel" },
] as const;

export const SHOOTER_OPTIONS = [
  { value: "flywheel", label: "Flywheel" },
  { value: "roller", label: "Roller" },
  { value: "other", label: "Diğer" },
] as const;

/** Pit: tırmanma seviyesi (1, 2 veya 3. seviye) */
export const CLIMB_LEVEL_OPTIONS = [
  { value: "none", label: "Yok" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
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
  { value: "practice", label: "Practice" },
  { value: "qual", label: "Qual" },
  { value: "playoff", label: "Playoff" },
] as const;
