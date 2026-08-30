import type { PropsWithChildren } from "react";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";
import { AppTheme } from "@/src/theme";

export function Screen({ children }: PropsWithChildren) { return <View style={AppTheme.screen}>{children}</View>; }
export function Card({ title, children }: PropsWithChildren<{ title: string }>) { return <View style={AppTheme.card}><Text style={AppTheme.cardTitle}>{title}</Text>{children}</View>; }
export function Metric({ label, value }: { label: string; value: string }) { return <View style={AppTheme.metric}><Text style={AppTheme.metricLabel}>{label}</Text><Text style={AppTheme.metricValue}>{value}</Text></View>; }
export function Input({ label, multiline, ...props }: TextInputProps & { label: string }) { return <View style={AppTheme.inputGroup}><Text style={AppTheme.label}>{label}</Text><TextInput style={[AppTheme.input, multiline && { minHeight: 96, textAlignVertical: "top" }]} multiline={multiline} placeholderTextColor={AppTheme.colors.muted} {...props} /></View>; }
export function Button({ title, onPress, variant = "primary" }: { title: string; onPress: () => void; variant?: "primary" | "secondary" }) { const secondary = variant === "secondary"; return <Pressable onPress={onPress} style={[AppTheme.button, secondary && AppTheme.buttonSecondary]}><Text style={[AppTheme.buttonText, secondary && AppTheme.buttonTextSecondary]}>{title}</Text></Pressable>; }

