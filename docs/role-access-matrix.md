# Attendance Role Access Matrix

## Scope
Cette matrice documente les acces aux routes du module `attendance`.

Roles suivis :
- `ADMIN`
- `COACH`
- `VIGIL`
- `SURVEILLANT`
- `APPRENANT`

## Routes

| Methode | Route | ADMIN | COACH | VIGIL | SURVEILLANT | APPRENANT | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST | `/attendance/scan` | non | non | oui | non | non | Scan general QR |
| POST | `/attendance/scan/learner` | non | non | oui | non | non | Scan apprenant |
| POST | `/attendance/scan/coach` | non | non | oui | non | non | Scan coach |
| POST | `/attendance/absence/:id/justify` | non | non | non | non | oui | Soumission justification absence |
| PUT | `/attendance/absence/:id/status` | oui | oui | non | non | non | Mise a jour statut absence |
| PUT | `/attendance/absence/:id/force-approve` | oui | oui | non | non | non | Force approve absence |
| PATCH | `/attendance/:id/status` | oui | oui | non | non | non | Mise a jour statut attendance |
| GET | `/attendance/scans/latest` | oui | non | oui | oui | non | Derniers scans |
| GET | `/attendance/absents/:referentialId` | oui | oui | non | oui | non | Absents par referentiel |
| GET | `/attendance/stats/daily` | oui | oui | oui | oui | non | Stats journalieres |
| GET | `/attendance/stats/monthly` | oui | oui | oui | oui | non | Stats mensuelles |
| GET | `/attendance/stats/yearly` | oui | oui | oui | oui | non | Stats annuelles |
| GET | `/attendance/stats/weekly` | oui | oui | oui | oui | non | Stats hebdomadaires |
| POST | `/attendance/mark-absences` | oui | non | non | non | non | Action admin uniquement |
| GET | `/attendance/promotion/:promotionId` | oui | oui | non | oui | non | Presence par promotion |
