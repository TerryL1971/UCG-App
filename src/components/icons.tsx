import Svg, { type SvgProps, Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const strokeProps = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

function base(size: number): SvgProps {
  return { width: size, height: size, viewBox: '0 0 24 24' };
}

export function ArrowLeftIcon({ size = 20, color = '#273368', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M19 12H5M12 19l-7-7 7-7" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 18, color = '#9AA0B4', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="6 9 12 15 18 9" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color = '#9AA0B4', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={11} cy={11} r={7} {...strokeProps(color, strokeWidth)} />
      <Line x1={21} y1={21} x2={16.6} y2={16.6} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function HeartIcon({ size = 18, color = '#C33531', strokeWidth = 2.2, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 9.5 7C19 16.65 12 21 12 21z"
        {...strokeProps(color, strokeWidth)}
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function FilterIcon({ size = 18, color = '#273368', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={14} cy={7} r={2.4} fill={color} />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={9} cy={17} r={2.4} fill={color} />
    </Svg>
  );
}

export function GridIcon({ size = 18, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={3} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
      <Rect x={13} y={3} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
      <Rect x={3} y={13} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
      <Rect x={13} y={13} width={8} height={8} rx={2} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function MessageIcon({ size = 18, color = '#C33531', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function UserIcon({ size = 18, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={8} r={4} {...strokeProps(color, strokeWidth)} />
      <Path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function PhoneIcon({ size = 20, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
        {...strokeProps(color, strokeWidth)}
      />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = '#fff', strokeWidth = 3 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="20 6 9 17 4 12" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function UploadIcon({ size = 16, color = '#fff', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 16V5" {...strokeProps(color, strokeWidth)} />
      <Path d="M8 9l4-4 4 4" {...strokeProps(color, strokeWidth)} />
      <Path d="M4 19h16" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function DownloadIcon({ size = 16, color = '#273368', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 4v11" {...strokeProps(color, strokeWidth)} />
      <Path d="M8 12l4 4 4-4" {...strokeProps(color, strokeWidth)} />
      <Path d="M4 19h16" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function StarIcon({ size = 14, color = '#C33531' }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M12 2l2.5 5.6L21 8.3l-4.6 4.2L17.6 19 12 15.9 6.4 19l1.2-6.5L3 8.3l6.5-.7L12 2z"
        fill={color}
      />
    </Svg>
  );
}

export function ShieldIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
      <Path d="M12 7v5l3 2" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function MapPinIcon({ size = 20, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" {...strokeProps(color, strokeWidth)} />
      <Circle cx={12} cy={9} r={2.5} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color = '#fff', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Line x1={12} y1={5} x2={12} y2={19} {...strokeProps(color, strokeWidth)} />
      <Line x1={5} y1={12} x2={19} y2={12} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color = '#C9CDD9', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={7} width={18} height={13} rx={2} {...strokeProps(color, strokeWidth)} />
      <Circle cx={12} cy={13.5} r={3.5} {...strokeProps(color, strokeWidth)} />
      <Path d="M8 7l1.5-3h5L16 7" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function IdCardIcon({ size = 21, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={5} width={18} height={14} rx={2} {...strokeProps(color, strokeWidth)} />
      <Circle cx={8.5} cy={11} r={2} {...strokeProps(color, strokeWidth)} />
      <Path d="M5 17c.5-2 2-3 3.5-3s3 1 3.5 3" {...strokeProps(color, strokeWidth)} />
      <Line x1={14} y1={9} x2={18} y2={9} {...strokeProps(color, strokeWidth)} />
      <Line x1={14} y1={13} x2={18} y2={13} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function DocumentIcon({ size = 21, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={4} y={3} width={16} height={18} rx={2} {...strokeProps(color, strokeWidth)} />
      <Line x1={8} y1={8} x2={16} y2={8} {...strokeProps(color, strokeWidth)} />
      <Line x1={8} y1={12} x2={16} y2={12} {...strokeProps(color, strokeWidth)} />
      <Line x1={8} y1={16} x2={12} y2={16} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function GaugeIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} {...strokeProps(color, strokeWidth)} />
      <Path d="M12 7v5l3 2" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function TransmissionIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={8} cy={17} r={3} {...strokeProps(color, strokeWidth)} />
      <Circle cx={17} cy={17} r={3} {...strokeProps(color, strokeWidth)} />
      <Path d="M8 17h6l3-9h-3" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function DrivetrainIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 14l2-6h12l2 6M4 14v4h2v-2h12v2h2v-4M4 14h16" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function FuelIcon({ size = 18, color = '#273368', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 3h9l3 6v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3z" {...strokeProps(color, strokeWidth)} />
      <Line x1={6} y1={12} x2={18} y2={12} {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function CarFrontIllustration({
  size = 220,
  bodyColor = '#273368',
}: {
  size?: number;
  bodyColor?: string;
}) {
  const h = size * (100 / 220);
  return (
    <Svg width={size} height={h} viewBox="0 0 220 100">
      <Path d="M14 76 L26 44 Q34 30 54 30 L150 30 Q170 30 178 44 L190 76 Z" fill={bodyColor} />
      <Rect x={16} y={70} width={188} height={18} rx={9} fill="#20263F" />
      <Circle cx={62} cy={88} r={14} fill="#141A47" />
      <Circle cx={62} cy={88} r={5.5} fill="#AEB6CE" />
      <Circle cx={158} cy={88} r={14} fill="#141A47" />
      <Circle cx={158} cy={88} r={5.5} fill="#AEB6CE" />
      <Rect x={42} y={38} width={24} height={14} rx={2} fill="#B9C6E8" />
      <Rect x={146} y={38} width={24} height={14} rx={2} fill="#B9C6E8" />
    </Svg>
  );
}

export function AvatarPersonIcon({ size = 24, color = '#3B2A20', skinColor = '#E8B98A' }: IconProps & { skinColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={47} r={24} fill={skinColor} />
      <Path d="M26 45 Q24 18 50 17 Q76 18 74 45 Q75 28 50 27 Q25 28 26 45 Z" fill={color} />
    </Svg>
  );
}

export function CheckCircleIcon({ size = 16, color = '#2F9E60', strokeWidth = 3.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="20 6 9 17 4 12" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}

export function PackageIcon({ size = 15, color = '#B7BBCB', strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 22V4a1 1 0 0 1 1-1h10l5 5v14" {...strokeProps(color, strokeWidth)} />
      <Path d="M5 3v6h9" {...strokeProps(color, strokeWidth)} />
    </Svg>
  );
}
