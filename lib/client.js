// DSH browser module for the Jev plugin settings panel.
window.__ModuleLoader__.load({ id: 'dsh-jev-mcp', factory: (require) => {
  const React = require('react');
  const { useEffect, useState } = React;
  const h = React.createElement;
  const ns = 'jev-mcp';
  const refs = { typesafe: 'TYPESAFE_API_KEY', openrouter: 'OPENROUTER_API_KEY', cloudflare: 'JEV_CLOUDFLARE_API_TOKEN', vercel: 'AI_GATEWAY_API_KEY', compatible: 'JEV_API_KEY' };
  const labels = { typesafe: 'TypeSafe', openrouter: 'OpenRouter', cloudflare: 'Cloudflare Workers AI', vercel: 'Vercel AI Gateway', compatible: '兼容 System One 的服务' };
  const ui = {
    page: { maxWidth: 860, display: 'grid', gap: 16, color: 'var(--dsw-alias-label-primary)' },
    card: { border: '0.5px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l4))', background: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2))', borderRadius: 'var(--dsw-radius-xl, 20px)', padding: 16, display: 'grid', gap: 12 },
    title: { margin: 0, fontSize: 18, lineHeight: 1.4, fontWeight: 600 },
    subtitle: { margin: 0, fontSize: 14, fontWeight: 600 },
    hint: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.5 },
    label: { display: 'grid', gap: 6, color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.5 },
    control: { width: '100%', minWidth: 0, height: 36, boxSizing: 'border-box', font: 'inherit', fontSize: 13, padding: '0 12px', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 'var(--dsw-radius-md, 12px)' },
    row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    primary: { height: 32, padding: '0 14px', font: 'inherit', fontSize: 13, color: 'var(--dsw-alias-label-primary-foreground, var(--dsw-alias-bg-base, #fff))', background: 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary))', border: 0, borderRadius: 'var(--dsw-radius-sm, 8px)', cursor: 'pointer' },
    alert: { margin: 0, color: 'var(--dsw-alias-state-error-primary)', fontSize: 12, lineHeight: 1.5 },
  };
  function Settings({ form, remote, view }) {
    const [loaded, setLoaded] = useState(null);
    const [draft, setDraft] = useState(null);
    const [secret, setSecret] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (form?.state?.value || view === 'summary') return;
      let live = true;
      remote?.settings?.describe?.().then(found => {
        const payload = found?.ok ? found.value : found;
        const list = Array.isArray(payload) ? payload : payload?.namespaces;
        const row = Array.isArray(list) ? list.find(item => item?.ns === ns) : list?.[ns];
        if (live && row) setLoaded({ value: row.value || row, revision: row.revision ?? 0 });
        else if (live) setMessage('无法读取 Jev 设置。');
      }).catch(() => { if (live) setMessage('无法读取 Jev 设置。'); });
      return () => { live = false; };
    }, [form, remote, view]);
    if (view === 'summary') return h('span', null, 'Jev 判断模型配置');
    const state = form?.state || loaded;
    const value = draft || state?.value;
    async function save() {
      if (!value || !state || busy) return;
      if ((value.provider === 'cloudflare' && !String(value.cloudflareAccountId || '').trim()) || (value.provider === 'compatible' && !String(value.compatibleBaseURL || '').trim())) { setMessage('请填写该供应商所需的 Account ID 或端点地址。'); return; }
      if (secret && !/^[\x21-\x7e]+$/.test(secret.trim())) { setMessage('API Key 格式无效。'); return; }
      setBusy(true); setMessage('');
      try {
        const fields = ['model', 'baseURL', 'provider', 'openrouterBaseURL', 'cloudflareBaseURL', 'cloudflareAccountId', 'compatibleBaseURL'];
        const ops = fields.map(key => ({ op: 'set', path: [key], value: ['baseURL', 'openrouterBaseURL', 'cloudflareBaseURL'].includes(key) ? '' : key === 'model' && value.provider !== 'compatible' ? 'jev-latest' : (value[key] || (key === 'provider' ? 'typesafe' : '')).trim() }));
        ops.push({ op: 'set', path: ['vercelZeroDataRetention'], value: value.vercelZeroDataRetention === true });
        const result = form ? await form.mutate(ops, state.revision) : await remote.settings.mutate(ns, ops, state.revision);
        if (result === false || result?.ok === false) { setMessage('设置保存失败，请刷新后重试。'); return; }
        if (!form && result?.value?.value) setLoaded(result.value);
        setDraft(null);
        if (secret.trim()) {
          const response = await remote?.credentials?.set(value.provider === 'typesafe' || !value.provider ? (value.apiKeyEnv || refs.typesafe) : refs[value.provider], secret.trim());
          if (!response?.ok) { setMessage('模型设置已保存，但 API Key 保存失败。'); return; }
          setSecret('');
        }
        setMessage('已保存。');
      } catch { setMessage('保存失败，请检查设置权限后重试。'); }
      finally { setBusy(false); }
    }
    if (!value) return h('p', { role: 'status' }, message || '正在加载 Jev 设置…');
    const input = (label, key, placeholder, displayDefault = false) => h('label', { style: ui.label }, label,
      h('input', { value: value[key] || (displayDefault ? placeholder : ''), placeholder, disabled: busy, onChange: e => setDraft({ ...value, [key]: e.target.value }), style: ui.control }));
    const fixedAddress = address => h('label', { style: ui.label }, 'API 地址', h('input', { value: address, readOnly: true, disabled: true, style: { ...ui.control, background: 'var(--dsw-alias-fill-disabled, var(--dsw-alias-bg-layer-3, #e6e6e6))', color: 'var(--dsw-alias-label-secondary, #666)', borderColor: 'var(--dsw-alias-border-l3, #ccc)', cursor: 'not-allowed' } }));
    const provider = value.provider || 'typesafe';
    return h('div', { style: ui.page },
      h('h2', { style: ui.title }, 'Jev 模型'),
      h('p', { style: ui.hint }, '配置 Jev 判断工具使用的服务与模型。'),
      h('section', { style: ui.card },
      h('h3', { style: ui.subtitle }, '连接设置'),
      h('label', { style: ui.label }, '供应商', h('select', { value: provider, disabled: busy, onChange: e => { setSecret(''); setDraft({ ...value, provider: e.target.value }); }, style: ui.control }, ...Object.entries(labels).map(([id, label]) => h('option', { key: id, value: id }, label)))),
      provider === 'typesafe' ? fixedAddress('https://api.typesafe.ai') : null,
      provider === 'openrouter' ? fixedAddress('https://openrouter.ai/api') : null,
      provider === 'cloudflare' ? fixedAddress('https://api.cloudflare.com/client/v4') : null,
      provider === 'compatible' ? input('System One 完整端点地址', 'compatibleBaseURL', 'https://example.com/v1/systemone') : null,
      provider === 'vercel' ? fixedAddress('https://ai-gateway.vercel.sh/v4/ai/evaluation-model') : null,
      provider === 'compatible' ? input('模型 ID', 'model', '填写兼容服务支持的模型 ID') : h('label', { style: ui.label }, '模型 ID', h('input', { value: 'jev-latest', disabled: true, readOnly: true, style: { ...ui.control, background: 'var(--dsw-alias-fill-disabled, var(--dsw-alias-bg-layer-3, #e6e6e6))', color: 'var(--dsw-alias-label-secondary, #666)', borderColor: 'var(--dsw-alias-border-l3, #ccc)', cursor: 'not-allowed' } })),
      provider === 'cloudflare' ? input('Cloudflare Account ID', 'cloudflareAccountId', 'Account ID') : null,
      provider === 'vercel' ? h('label', { style: { ...ui.row, fontSize: 13 } }, h('input', { type: 'checkbox', checked: value.vercelZeroDataRetention === true, disabled: busy, onChange: e => setDraft({ ...value, vercelZeroDataRetention: e.target.checked }) }), ' 仅使用零数据保留供应商') : null,
      h('label', { style: ui.label }, labels[provider] + ' API Key / Token', h('input', { type: 'password', autoComplete: 'new-password', placeholder: '留空保留已保存的密钥', value: secret, disabled: busy, onChange: e => setSecret(e.target.value), style: ui.control })),
      h('small', { style: ui.hint }, '密钥保存在 DSH 凭据库，不写入插件配置。'),
      h('div', { style: { ...ui.row, justifyContent: 'flex-end' } }, h('button', { type: 'button', onClick: save, disabled: busy || state?.writable === false, style: { ...ui.primary, opacity: busy || state?.writable === false ? 0.55 : 1 } }, busy ? '保存中…' : '保存设置')),
      state?.writable === false ? h('p', { role: 'alert', style: ui.alert }, '当前设置被更高优先级的配置覆盖。') : null,
      message ? h('p', { role: 'status', style: message === '已保存。' ? ui.hint : ui.alert }, message) : null));
  }
  function apply(ctx) {
    const page = props => h(Settings, { ...props, remote: ctx.remote });
    ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'jev-model', order: 26, label: () => 'Jev 模型', inject: () => ({ remote: ctx.remote }) }, page));
    ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({ name: 'plugins.bundle.config', key: 'dsh-jev-mcp' }, page));
    ctx.slots.inject('plugins.row.config', () => ctx.slots.register({ name: 'plugins.row.config', key: 'dsh-jev-mcp#jev-mcp' }, page));
  }
  return { name: 'dsh-jev-mcp', inject: ['slots', 'remote', 'remote.settings', 'remote.credentials'], apply };
}});
