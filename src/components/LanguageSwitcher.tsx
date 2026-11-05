import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ style }: { style?: React.CSSProperties }) {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #ddd',
        background: 'white',
        fontSize: 14,
        cursor: 'pointer',
        ...style,
      }}
    >
      <option value="es">Español</option>
      <option value="en">English</option>
    </select>
  );
}
