import React from 'react';
import {publicServiceUrl} from './security/policy.mjs';
export default function AdminPage(){return <section className="container standalone-page"><h1>Yönetim merkezi</h1><p>Ürünler, sayfalar, kampanyalar ve kullanıcılar yönetim panelinde düzenlenir.</p><a className="primary" href={publicServiceUrl('/admin/#/giris')}>Admin panelini aç</a></section>;}
