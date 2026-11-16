import {translate as t} from './i18n/core.js';
import React from 'react';
import {publicServiceUrl} from './security/policy.mjs';
export default function AdminPage(){return <section className="container standalone-page"><h1>{t("Yönetim merkezi")}</h1><p>{t("Ürünler, sayfalar, kampanyalar ve kullanıcılar yönetim panelinde düzenlenir.")}</p><a className="primary" href={publicServiceUrl('/admin/#/giris')}>{t("Admin panelini aç")}</a></section>;}
