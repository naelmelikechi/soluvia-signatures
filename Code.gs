/**
 * ===================================================
 * SOLUVIA - Déploiement automatique de signatures mail
 * ===================================================
 *
 * PRÉREQUIS :
 * 1. Créer un Service Account GCP avec délégation de domaine (voir GUIDE)
 * 2. Ajouter la bibliothèque OAuth2 dans Apps Script :
 *    Éditeur > Bibliothèques > ID : 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
 * 3. Coller la clé JSON du service account dans :
 *    Paramètres du projet > Propriétés du script > SERVICE_ACCOUNT_KEY
 * 4. Remplir la feuille "Collaborateurs" et "Config" (URL du logo)
 */

// ============================================
// CONFIGURATION
// ============================================

var ICON_TEL_URL = "https://api.iconify.design/mdi/phone.svg?color=%2358855C";
var ICON_EMAIL_URL = "https://api.iconify.design/mdi/email-outline.svg?color=%2358855C";
var ICON_WEB_URL = "https://api.iconify.design/mdi/web.svg?color=%2358855C";
var GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.settings.basic";

function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName("Config");
  return {
    logoUrl: configSheet.getRange("B1").getValue(),
    iconTelUrl: ICON_TEL_URL,
    iconEmailUrl: ICON_EMAIL_URL,
    iconWebUrl: ICON_WEB_URL
  };
}

// ============================================
// SERVICE ACCOUNT - OAUTH2 AVEC IMPERSONATION
// ============================================

/**
 * Crée un service OAuth2 qui impersonne un utilisateur du domaine.
 * Nécessite la bibliothèque OAuth2 et la clé du service account.
 */
function getGmailServiceForUser(userEmail) {
  var keyJson = PropertiesService.getScriptProperties().getProperty("SERVICE_ACCOUNT_KEY");
  if (!keyJson) {
    throw new Error("Clé du service account introuvable. Ajoutez-la dans Propriétés du script > SERVICE_ACCOUNT_KEY");
  }

  var key = JSON.parse(keyJson);

  return OAuth2.createService("Gmail:" + userEmail)
    .setTokenUrl("https://oauth2.googleapis.com/token")
    .setPrivateKey(key.private_key)
    .setIssuer(key.client_email)
    .setSubject(userEmail)
    .setScope(GMAIL_SCOPE)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setCache(CacheService.getScriptCache());
}

/**
 * Applique la signature Gmail pour un utilisateur via l'API REST.
 */
function setSignatureForUser(userEmail, signatureHtml) {
  var service = getGmailServiceForUser(userEmail);

  if (!service.hasAccess()) {
    throw new Error("Pas d'accès OAuth2 pour " + userEmail + ". Vérifiez la délégation de domaine. Détails : " + service.getLastError());
  }

  // Récupérer l'adresse SendAs principale
  var listUrl = "https://gmail.googleapis.com/gmail/v1/users/" + encodeURIComponent(userEmail) + "/settings/sendAs";
  var listResponse = UrlFetchApp.fetch(listUrl, {
    headers: { Authorization: "Bearer " + service.getAccessToken() },
    muteHttpExceptions: true
  });

  if (listResponse.getResponseCode() !== 200) {
    throw new Error("Erreur API (" + listResponse.getResponseCode() + ") : " + listResponse.getContentText());
  }

  var sendAsList = JSON.parse(listResponse.getContentText()).sendAs;
  var primarySendAs = null;

  for (var i = 0; i < sendAsList.length; i++) {
    if (sendAsList[i].isPrimary) {
      primarySendAs = sendAsList[i];
      break;
    }
  }

  if (!primarySendAs) {
    throw new Error("Adresse SendAs principale introuvable pour " + userEmail);
  }

  // Mettre à jour la signature
  var updateUrl = "https://gmail.googleapis.com/gmail/v1/users/" + encodeURIComponent(userEmail) + "/settings/sendAs/" + encodeURIComponent(primarySendAs.sendAsEmail);
  var updateResponse = UrlFetchApp.fetch(updateUrl, {
    method: "put",
    headers: {
      Authorization: "Bearer " + service.getAccessToken(),
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({
      signature: signatureHtml
    }),
    muteHttpExceptions: true
  });

  if (updateResponse.getResponseCode() !== 200) {
    throw new Error("Erreur mise à jour (" + updateResponse.getResponseCode() + ") : " + updateResponse.getContentText());
  }

  return true;
}

// ============================================
// TEMPLATE HTML DE LA SIGNATURE
// ============================================

function getSignatureHtml(nom, poste, telephone, email, config) {
  return '<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; color: #102D3A;">'
    + '<tr>'
    + '<td style="vertical-align: middle; padding-right: 22px;">'
    + '<a href="https://mysoluvia.com" style="text-decoration: none;">'
    + '<img src="' + config.logoUrl + '" alt="Soluvia" width="140" style="display: block;" />'
    + '</a>'
    + '</td>'
    + '<td style="width: 3px; background-color: #58855C; font-size: 0; line-height: 0;" width="3">&nbsp;</td>'
    + '<td style="padding-left: 22px; vertical-align: top;">'
    + '<table cellpadding="0" cellspacing="0" border="0">'
    + '<tr><td colspan="2" style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #102D3A; padding-bottom: 1px;">'
    + nom
    + '</td></tr>'
    + '<tr><td colspan="2" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #58855C; font-weight: bold; padding-bottom: 14px; text-transform: uppercase; letter-spacing: 1.5px;">'
    + poste
    + '</td></tr>'
    + '<tr>'
    + '<td style="width: 28px; vertical-align: middle; padding-bottom: 7px;">'
    + '<img src="' + config.iconTelUrl + '" alt="" width="18" height="18" style="display: block;" />'
    + '</td>'
    + '<td style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #102D3A; padding-left: 10px; padding-bottom: 7px;">'
    + telephone
    + '</td>'
    + '</tr>'
    + '<tr>'
    + '<td style="width: 28px; vertical-align: middle; padding-bottom: 7px;">'
    + '<img src="' + config.iconEmailUrl + '" alt="" width="18" height="18" style="display: block;" />'
    + '</td>'
    + '<td style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; padding-left: 10px; padding-bottom: 7px;">'
    + '<a href="mailto:' + email + '" style="color: #102D3A; text-decoration: none;">' + email + '</a>'
    + '</td>'
    + '</tr>'
    + '<tr>'
    + '<td style="width: 28px; vertical-align: middle;">'
    + '<img src="' + config.iconWebUrl + '" alt="" width="18" height="18" style="display: block;" />'
    + '</td>'
    + '<td style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; padding-left: 10px;">'
    + '<a href="https://mysoluvia.com" style="color: #58855C; text-decoration: none;">mysoluvia.com</a>'
    + '</td>'
    + '</tr>'
    + '</table>'
    + '</td>'
    + '</tr>'
    + '</table>';
}

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Déploie les signatures pour TOUS les collaborateurs via le service account.
 * Utilise l'impersonation pour modifier la signature de chaque utilisateur.
 */
function deployerSignatures() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Collaborateurs");
  const config = getConfig();

  if (!config.logoUrl) {
    SpreadsheetApp.getUi().alert("Erreur : Veuillez renseigner l'URL du logo dans la feuille Config (cellule B1).");
    return;
  }

  // Vérifier que la clé du service account est configurée
  var keyJson = PropertiesService.getScriptProperties().getProperty("SERVICE_ACCOUNT_KEY");
  if (!keyJson) {
    SpreadsheetApp.getUi().alert(
      "Erreur : Clé du service account introuvable.\n\n" +
      "1. Allez dans Paramètres du projet (roue dentée)\n" +
      "2. Propriétés du script\n" +
      "3. Ajoutez la propriété SERVICE_ACCOUNT_KEY\n" +
      "4. Collez le contenu du fichier JSON du service account"
    );
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf("Statut");

  let succes = 0;
  let erreurs = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nom = row[0];
    const poste = row[1];
    const email = row[2];
    const telephone = row[3];

    if (!nom || !email) continue;

    const signatureHtml = getSignatureHtml(nom, poste, telephone, email, config);

    try {
      setSignatureForUser(email, signatureHtml);
      sheet.getRange(i + 1, statusCol + 1).setValue("✅ Déployé - " + new Date().toLocaleDateString("fr-FR"));
      succes++;
    } catch (error) {
      sheet.getRange(i + 1, statusCol + 1).setValue("❌ Erreur : " + error.message);
      erreurs++;
      Logger.log("Erreur pour " + email + " : " + error.message);
    }
  }

  SpreadsheetApp.getUi().alert(
    "Déploiement terminé !\n\n" +
    "✅ Succès : " + succes + "\n" +
    "❌ Erreurs : " + erreurs + "\n\n" +
    "Consultez la colonne Statut pour les détails."
  );
}

/**
 * Prévisualise la signature du premier collaborateur.
 */
function previsualiserSignature() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Collaborateurs");
  const config = getConfig();

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert("Ajoutez au moins un collaborateur dans la feuille.");
    return;
  }

  const row = data[1];
  const signatureHtml = getSignatureHtml(row[0], row[1], row[3], row[2], config);

  const htmlOutput = HtmlService
    .createHtmlOutput(
      '<div style="padding: 20px; font-family: Arial, sans-serif;">' +
      '<p style="color:#8AA0A8; font-size:11px; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px;">Prévisualisation — ' + row[0] + '</p>' +
      '<div style="padding: 20px; border: 1px solid #E2E8EA; border-radius: 8px;">' +
      signatureHtml +
      '</div>' +
      '<p style="color:#8AA0A8; font-size:11px; margin-top:16px;">Si le résultat vous convient, lancez le déploiement via le menu Soluvia.</p>' +
      '</div>'
    )
    .setWidth(600)
    .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Prévisualisation — Signature Soluvia");
}

/**
 * Déploie la signature pour l'utilisateur actuel uniquement.
 * Ne nécessite PAS le service account.
 */
function deployerMaSignature() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Collaborateurs");
  const config = getConfig();
  const currentEmail = Session.getActiveUser().getEmail();

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === currentEmail) {
      const signatureHtml = getSignatureHtml(data[i][0], data[i][1], data[i][3], data[i][2], config);

      try {
        Gmail.Users.Settings.SendAs.update(
          { signature: signatureHtml },
          "me",
          currentEmail
        );
        SpreadsheetApp.getUi().alert("✅ Votre signature a été mise à jour !");
      } catch (error) {
        SpreadsheetApp.getUi().alert("❌ Erreur : " + error.message);
      }
      return;
    }
  }

  SpreadsheetApp.getUi().alert("Votre email (" + currentEmail + ") n'a pas été trouvé dans la feuille Collaborateurs.");
}

// ============================================
// MENU
// ============================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📧 Soluvia - Signatures")
    .addItem("👁️ Prévisualiser la signature", "previsualiserSignature")
    .addSeparator()
    .addItem("🚀 Déployer TOUTES les signatures", "deployerSignatures")
    .addItem("👤 Déployer MA signature uniquement", "deployerMaSignature")
    .addToUi();
}
