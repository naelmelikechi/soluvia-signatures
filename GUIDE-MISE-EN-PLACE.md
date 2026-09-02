# Signatures Email Soluvia - Guide de mise en place

## Vue d'ensemble

Ce système déploie automatiquement des signatures email uniformes pour toute
l'équipe Soluvia. L'admin lance le script une seule fois depuis Google Sheets
et la signature est appliquée à tous les collaborateurs via un Service Account
Google Cloud avec délégation de domaine.

**Architecture :**
- Google Sheet = base de données des collaborateurs
- Google Apps Script = moteur de déploiement
- Service Account GCP = accès aux comptes Gmail de chaque utilisateur
- Bibliothèque OAuth2 = gestion des tokens d'impersonation

---

## Étape 1 : Héberger le logo sur Google Drive

1. Ouvrir **Google Drive**
2. Uploader le fichier `logo.png`
3. Clic droit > **Partager** > **Toute personne ayant le lien**
4. Copier le lien (ex: `https://drive.google.com/file/d/XXXXXXX/view`)
5. Transformer en URL directe :
   - Prendre l'ID du fichier (la partie `XXXXXXX`)
   - Créer l'URL : `https://lh3.googleusercontent.com/d/XXXXXXX`

> **Attention** : Le format `drive.google.com/uc?export=view` ne fonctionne
> pas toujours dans les clients mail. Utiliser le format `lh3.googleusercontent.com`.

> Les icônes (téléphone, email, web) sont servies depuis Iconify CDN,
> pas besoin de les héberger.

---

## Étape 2 : Créer le Google Sheet

1. Aller sur **sheets.google.com** > Créer une nouvelle feuille
2. Nommer la feuille **"Signatures Email Soluvia"**

### Feuille "Collaborateurs" (renommer "Feuille 1")

Créer les colonnes suivantes en ligne 1 :

| A | B | C | D | E |
|---|---|---|---|---|
| **Nom** | **Poste** | **Email** | **Téléphone** | **Statut** |

Puis remplir avec les infos de chaque membre :

| Nom | Poste | Email | Téléphone | Statut |
|---|---|---|---|---|
| Nael Melikechi | Directeur Général | nmelikechi@mysoluvia.com | +33 6 12 34 56 78 | |

### Feuille "Config" (créer un nouvel onglet)

| A | B |
|---|---|
| **Logo URL** | `https://lh3.googleusercontent.com/d/1gXsZWGU06nnpfHhRYznWOX87ofLTfy5D` |

---

## Étape 3 : Créer le projet Google Cloud et le Service Account

### 3.1 — Projet Google Cloud

1. Aller sur **console.cloud.google.com**
2. Créer un nouveau projet (ou utiliser celui déjà lié à Apps Script)
3. Dans **APIs & Services** > **Bibliothèque**, chercher et activer **Gmail API**

### 3.2 — Créer le Service Account

1. Aller dans **IAM et administration** > **Comptes de service**
2. Cliquer **Créer un compte de service**
3. Nom : `signatures-soluvia` (ou ce que vous voulez)
4. Cliquer **Créer et continuer** > **OK**
5. Cliquer sur le compte de service créé
6. Onglet **Clés** > **Ajouter une clé** > **Créer une clé** > **JSON**
7. Le fichier JSON se télécharge automatiquement — **gardez-le précieusement**

### 3.3 — Activer la délégation de domaine

1. Sur la page du compte de service, cliquer **Modifier**
2. Ouvrir **Afficher les paramètres avancés**
3. Cocher **Activer la délégation au niveau du domaine Google Workspace**
4. Renseigner un nom de produit (ex: "Signatures Soluvia")
5. Sauvegarder
6. Noter le **Client ID** affiché (nombre à ~21 chiffres)

---

## Étape 4 : Autoriser le Service Account dans l'Admin Console

1. Aller sur **admin.google.com**
2. **Sécurité** > **Contrôle des accès et des données** > **Contrôles des API**
3. Section **Délégation au niveau du domaine** > **Gérer la délégation au niveau du domaine**
4. Cliquer **Ajouter**
5. **ID client** : coller le Client ID du service account (étape 3.3)
6. **Champs d'application OAuth** : coller exactement :
   ```
   https://www.googleapis.com/auth/gmail.settings.basic
   ```
7. Cliquer **Autoriser**

---

## Étape 5 : Configurer Apps Script

### 5.1 — Ajouter le script

1. Dans le Google Sheet, aller dans **Extensions** > **Apps Script**
2. Supprimer le code par défaut
3. Copier-coller tout le contenu du fichier `Code.gs`
4. Sauvegarder (Ctrl+S)

### 5.2 — Ajouter la bibliothèque OAuth2

1. Dans l'éditeur Apps Script, cliquer sur **Bibliothèques** (icône + à gauche)
2. Coller l'ID suivant :
   ```
   1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
   ```
3. Cliquer **Rechercher**
4. Sélectionner la dernière version
5. Cliquer **Ajouter**

### 5.3 — Ajouter la clé du Service Account

1. Dans l'éditeur Apps Script, cliquer sur **Paramètres du projet** (roue dentée)
2. Section **Propriétés du script** > **Modifier les propriétés du script**
3. Cliquer **Ajouter une propriété**
4. **Propriété** : `SERVICE_ACCOUNT_KEY`
5. **Valeur** : coller le **contenu entier** du fichier JSON téléchargé à l'étape 3.2
6. Sauvegarder

### 5.4 — Lier au projet GCP (si nécessaire)

1. Dans **Paramètres du projet**, section **Projet Google Cloud Platform (GCP)**
2. Cliquer **Modifier le projet**
3. Entrer le **numéro du projet** GCP (visible sur console.cloud.google.com)
4. Cliquer **Définir le projet**

---

## Étape 6 : Déployer les signatures

1. Retourner dans le Google Sheet
2. Rafraîchir la page (F5)
3. Le menu **"📧 Soluvia - Signatures"** apparaît dans la barre de menu
4. Cliquer sur **"👁️ Prévisualiser la signature"** pour vérifier le rendu
5. Si tout est bon, cliquer sur **"🚀 Déployer TOUTES les signatures"**
6. Accepter les autorisations demandées par Google
7. Vérifier la colonne **Statut** : chaque ligne doit afficher "✅ Déployé"

---

## Utilisation au quotidien

### Ajouter un nouveau collaborateur
1. Ajouter une ligne dans la feuille "Collaborateurs"
2. Menu > Soluvia - Signatures > Déployer TOUTES les signatures

### Un collaborateur veut mettre à jour sa propre signature
1. Le collaborateur ouvre le Google Sheet
2. Menu > Soluvia - Signatures > Déployer MA signature uniquement
   (ne nécessite pas le service account)

### Modifier le design de la signature
1. Modifier le template HTML dans la fonction `getSignatureHtml()` du script
2. Prévisualiser > Déployer

---

## Dépannage

| Problème | Solution |
|---|---|
| "Clé du service account introuvable" | Vérifier que la propriété `SERVICE_ACCOUNT_KEY` est bien ajoutée dans Paramètres > Propriétés du script |
| "Pas d'accès OAuth2" | Vérifier la délégation de domaine dans l'Admin Console (étape 4) et que le scope est exact |
| "Erreur API 403" | Le service account n'a pas les permissions. Revérifier le Client ID et le scope dans l'Admin Console |
| "Erreur API 400" | Vérifier que l'email du collaborateur est correct et actif dans Google Workspace |
| Logo ne s'affiche pas | Vérifier que le fichier est partagé "Toute personne ayant le lien" et utiliser le format `lh3.googleusercontent.com` |
| Menu n'apparaît pas | Rafraîchir la page (F5). Le menu se charge via `onOpen()` |

---

## Notes importantes

- Le déploiement centralisé nécessite un **Service Account GCP avec délégation de domaine**
- La fonction "Déployer MA signature" fonctionne sans service account (chaque utilisateur peut l'utiliser)
- La colonne "Statut" se met à jour automatiquement après chaque déploiement
- Le logo Google Drive met parfois quelques minutes à s'afficher dans les mails
- Les icônes proviennent de **Iconify CDN** (api.iconify.design) — aucun hébergement nécessaire
