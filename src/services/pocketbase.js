import PocketBase from 'pocketbase';

// URL берется из env-переменных (на Coolify укажете свой URL)
const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://pocketbase-zgmen67x4abcj44xsuvjlsbf.176.112.158.15.sslip.io/');

export default pb;