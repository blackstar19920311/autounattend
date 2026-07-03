import { useLanguage } from '../i18n/LanguageContext';
import { User } from 'lucide-react';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import InputField from '../components/InputField';
import Toggle from '../components/Toggle';



export default function UserAccountSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

  




  return (
    <Card title={t('section.userAccount')} icon={<User size={20} />} tooltip={t('tt.userAccountDesc')}>


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
