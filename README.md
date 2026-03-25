# ReloCare 🏠
**Gestion clients relocation · Espace agence + Espace client · Genève**

---

## Structure du projet

```
relocare/
├── public/
│   ├── index.html          ← L'application complète
│   └── payment-success.html ← Page après paiement Stripe
├── netlify/
│   └── functions/
│       ├── create-checkout.js  ← Crée la session de paiement Stripe
│       └── stripe-webhook.js   ← Confirme le paiement (appelé par Stripe)
├── .env.example            ← Modèle de variables d'environnement
├── .gitignore              ← Fichiers exclus de GitHub
├── netlify.toml            ← Configuration Netlify
├── package.json            ← Dépendances (Stripe SDK)
└── README.md               ← Ce fichier
```

---

## 🚀 Déploiement étape par étape

### ÉTAPE 1 — Préparer GitHub

1. Allez sur [github.com](https://github.com) et connectez-vous
2. Cliquez sur **"New repository"** (bouton vert en haut à droite)
3. Nommez-le `relocare` (ou ce que vous voulez)
4. Laissez-le **Private** (recommandé)
5. Cliquez **"Create repository"**

**Uploader les fichiers :**
- Sur la page du repo, cliquez **"uploading an existing file"**
- Glissez-déposez TOUS les fichiers et dossiers du projet
- Respectez la structure (le dossier `public/`, `netlify/`, etc.)
- Cliquez **"Commit changes"**

---

### ÉTAPE 2 — Connecter Netlify

1. Allez sur [netlify.com](https://netlify.com) et créez un compte gratuit
2. Cliquez **"Add new site" > "Import an existing project"**
3. Choisissez **GitHub** et autorisez l'accès
4. Sélectionnez votre repo `relocare`
5. Laissez les paramètres par défaut (Netlify lit automatiquement `netlify.toml`)
6. Cliquez **"Deploy site"**

✅ Votre site est en ligne en 2 minutes sur une URL `xxx.netlify.app` !

---

### ÉTAPE 3 — Configurer Stripe

#### 3a. Récupérer vos clés Stripe

1. Allez sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Cliquez **"Développeurs" > "Clés API"**
3. Copiez la **Clé secrète** (`sk_test_...` en mode test)

#### 3b. Configurer le Webhook Stripe

1. Dans Stripe Dashboard > **"Développeurs" > "Webhooks"**
2. Cliquez **"Ajouter un endpoint"**
3. URL : `https://VOTRE-SITE.netlify.app/.netlify/functions/stripe-webhook`
4. Événements à écouter : sélectionnez **`checkout.session.completed`**
5. Copiez le **"Secret de signature"** (`whsec_...`)

#### 3c. Ajouter les clés dans Netlify

1. Dans Netlify : **Site settings > Environment variables**
2. Ajoutez ces variables une par une :

| Variable | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_votre_cle_secrete` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_votre_secret_webhook` |

3. Cliquez **"Save"** puis **"Trigger deploy"** pour redéployer

---

### ÉTAPE 4 — Activer Stripe dans l'app

Dans `public/index.html`, cherchez la fonction `doStripe()` et remplacez :

```javascript
// AVANT (simulation) :
if(confirm('Paiement Stripe...')) { ... }

// APRÈS (vrai Stripe) :
async function doStripe() {
  const amt = pkgA || Number(document.getElementById('cr-amt')?.value || 0);
  if (!amt || amt < 50) { notify('Minimum 50 CHF/EUR'); return; }
  const c = cBy(curU?.cid);
  if (!c) return;
  const bonus = amt >= 200 ? 10 : amt >= 100 ? 5 : 0;

  const res = await fetch('/.netlify/functions/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amt,
      currency: c.dev,
      clientCode: c.cod,
      clientName: c.p + ' ' + c.n,
      bonusPercent: bonus
    })
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
  else notify('Erreur : ' + data.error);
}
```

---

## 🔐 Système de login sécurisé

### Situation actuelle
Les mots de passe sont en dur dans le code HTML (`admin123`, `client123`). C'est suffisant pour tester, mais **pas pour la production**.

### Solution recommandée : Netlify Identity

Netlify propose un système d'authentification gratuit (jusqu'à 1000 utilisateurs).

#### Activer Netlify Identity

1. Dans Netlify : **Site settings > Identity > Enable Identity**
2. Sous **"Registration"**, choisissez **"Invite only"** (vous invitez chaque client)
3. Sous **"External providers"**, vous pouvez activer Google si vous voulez

#### Inviter des utilisateurs

1. Dans Netlify : **Identity > Invite users**
2. Entrez l'email du client
3. Il reçoit un lien pour choisir son mot de passe

#### Intégrer dans l'app (version simplifiée)

Ajoutez ce script dans `index.html` avant `</head>` :
```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
```

Puis remplacez la fonction `loginC()` :
```javascript
function loginC() {
  netlifyIdentity.open('login');
  netlifyIdentity.on('login', user => {
    // user.user_metadata.clientCode doit être défini lors de l'invitation
    const code = user.user_metadata?.clientCode || '';
    const c = db.clients.find(x => (x.cod||'').toUpperCase() === code.toUpperCase());
    if (!c) { notify('Profil client introuvable'); return; }
    curU = { type: 'c', cid: c.id };
    // ... suite du login
  });
}
```

### Alternative simple : Netlify Function d'authentification

Pour une solution plus personnalisée, une Netlify Function `auth-client.js` peut vérifier email + code client en comparant à une liste chiffrée côté serveur (hors du HTML).

---

## 📦 Passage en production (checklist)

- [ ] Remplacer les clés Stripe `sk_test_` par `sk_live_`
- [ ] Configurer un domaine personnalisé dans Netlify (ex: `app.relocare.ch`)
- [ ] Activer Netlify Identity pour les vrais logins
- [ ] Migrer les données de `localStorage` vers une base de données (Supabase recommandé)
- [ ] Ajouter un certificat SSL (automatique sur Netlify)
- [ ] Tester un vrai paiement en mode live avec une vraie carte

---

## 💬 Support

Pour toute question sur le déploiement, contactez votre développeur ReloCare.

---

*ReloCare v2 — Genève · Fait avec ❤️*
