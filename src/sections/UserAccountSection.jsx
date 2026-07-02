import { useLanguage } from '../i18n/LanguageContext';
import { User } from 'lucide-react';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import InputField from '../components/InputField';
import Toggle from '../components/Toggle';

/**
 * Termékkulcs automatikus formázása: nagybetűs, kötőjelek 5 karakterenként
 */
function formatProductKey(raw) {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 25);
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 5) {
    parts.push(cleaned.slice(i, i + 5));
  }
  return parts.join('-');
}

export default function UserAccountSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

  
  const handleProductKeyChange = (value) => {
    const formatted = formatProductKey(value);
    setConfig((prev) => ({ ...prev, productKey: formatted }));
  };

  const prefix = config.computerName || 'PC';
  const previewName = config.randomSuffix
    ? `${prefix}-AB12`
    : prefix;

  return (
    <Card title={t('section.userAccount')} icon={<User size={20} />}>
      {/* Számítógépnév + random utótag checkbox egy sorban */}
      <div className="form-group">
        <label className="form-label">{t('user.computerName')}</label>
        <div className="computer-name-row">
          <div className="computer-name-input">
            <InputField
              value={config.computerName}
              onChange={(value) => setConfig((prev) => ({ ...prev, computerName: value }))}
              error={errors.computerName}
              maxLength={config.randomSuffix ? 8 : 15}
              placeholder="PC"
              id="computerName"
            />
          </div>
          <div className="computer-name-separator" />
          <Checkbox
            label={t('user.randomSuffix')}
            checked={config.randomSuffix}
            onChange={(value) => setConfig((prev) => ({ ...prev, randomSuffix: value }))}
            id="random-suffix"
          />
        </div>
        <p className="toggle-description" style={{ marginTop: -4 }}>
          💡 {t('user.preview')}: <strong>{previewName}</strong>
          {config.randomSuffix && (
            <span> {t('user.suffix.desc')}</span>
          )}
        </p>
      </div>

      <InputField
        label={t('user.productKey')}
        value={config.productKey}
        onChange={handleProductKeyChange}
        placeholder={t('user.productKey.ph')}
        maxLength={29}
        error={errors.productKey}
        id="productKey"
      />

      <InputField
        label={t('user.username')}
        value={config.username}
        onChange={(value) => setConfig((prev) => ({ ...prev, username: value }))}
        required
        placeholder={t('user.username.ph')}
        error={errors.username}
        id="username"
      />

      <InputField
        label={t('user.password')}
        type="password"
        value={config.password}
        onChange={(value) => setConfig((prev) => ({ ...prev, password: value }))}
        placeholder={t('user.password.ph')}
        id="password"
      />

      <Toggle
        id="autoLogin"
        label={t('user.autoLogin')}
        description={t('user.autoLogin.desc')}
        checked={config.autoLogin}
        onChange={(value) => setConfig((prev) => ({ ...prev, autoLogin: value }))}
        disabled={!config.username}
      />
    </Card>
  );
}
