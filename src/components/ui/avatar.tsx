import { View, Text, Image } from '@tarojs/components';

interface Props {
  src?: string;
  size?: number;
  name?: string;
}

export default function Avatar({ src, size = 32, name = '' }: Props) {
  const initial = name ? name.charAt(0) : '?';

  if (src) {
    return (
      <Image
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', flexShrink: 0 }}
        src={src}
        mode="aspectFill"
      />
    );
  }

  return (
    <View
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e0e0e0, #c8c8cc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: `${Math.floor(size * 0.45)}px`, color: '#fff', fontWeight: 600 }}>
        {initial}
      </Text>
    </View>
  );
}
