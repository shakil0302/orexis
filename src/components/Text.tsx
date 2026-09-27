import { Text as RNText, type TextProps } from "react-native";
import { colors, type } from "../theme";

type Variant = keyof typeof type;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
}

/** Themed text. Defaults to body in the primary text colour. */
export function T({ variant = "body", color, style, ...rest }: Props) {
  return <RNText {...rest} style={[type[variant], { color: color ?? colors.text }, style]} />;
}

export function Muted(props: Props) {
  return <T variant="meta" color={colors.muted} {...props} />;
}
