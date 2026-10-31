# Samsung TV (Tizen) – Web Game Ports Hub

Ziel: Samsung Neo QLED 2024 (Tizen 8.0). Die App ist die gleiche Web-App wie überall, mit TV-Fernbedienung und Controller-Steuerung.
Spiele werden an den **eingebauten TV-Browser** übergeben (viele Spiele-Hosts verbieten Einbettung, der TV-Browser hat diese Einschränkung nicht).

> **Gaming Hub:** Samsungs Gaming Hub ist ein geschlossenes System. Eigene/sideloadete Apps tauchen dort nicht auf,
> sondern nur im normalen **Apps**-Bereich. Ein Eintrag im Gaming Hub ist nur über eine Partnerschaft/Store-Freigabe von Samsung möglich.

## Steuerung
| | Fernbedienung | Controller (Xbox/PS/Switch, Bluetooth) |
|---|---|---|
| Bewegen | Pfeiltasten | D-Pad / linker Stick |
| Öffnen | Enter | A |
| Zurück / Suche leeren / App verlassen | Return | B |
| Favorit | – | X |
| Im TV-Browser öffnen | – | Y |
| Buchstabe vor/zurück | – | LB / RB |

## Installation (einmalig, ca. 30 Min.)
Ohne Samsung-Zertifikat lässt sich nichts auf den TV installieren – das ist eine Vorgabe von Samsung, kein Umweg möglich.

1. **TV in den Entwicklermodus:** Apps öffnen → auf der Fernbedienung `1 2 3 4 5` eingeben → *Developer mode* **On**,
   IP-Adresse deines PCs eintragen → TV neu starten. (TV und PC im gleichen Netzwerk.)
2. **Tizen Studio** installieren (https://developer.tizen.org/development/tizen-studio/download), im Package Manager
   *TV Extensions* (Tizen 8.0) mitinstallieren.
3. **Samsung-Zertifikat:** Tizen Studio → *Tools → Certificate Manager* → **+** → *Samsung* → *TV* → mit Samsung-Account anmelden.
   Das Zertifikat wird an die Seriennummer (DUID) deines TVs gebunden; den Profilnamen merken.
4. **TV verbinden:** *Tools → Device Manager* → *Remote Device Manager* → **+** → IP des TVs, Port 26101 → *Connection* **On**.
5. **Bauen & installieren** (im Projektordner, `<Tizen Studio>/tools/ide/bin` im PATH):
   ```
   node scripts/build-tizen.mjs --profile <dein-profilname>
   tizen install -n WebGamePortsHub.wgt -s <TV-IP>:26101 -- tizen/dist
   ```
   Oder: *File → Import → Tizen → Tizen Project* auf `tizen/build` zeigen, dann Rechtsklick → *Run As → Tizen Web Application*.

Die App erscheint danach im Apps-Bereich des TVs. Der Entwicklermodus und das Zertifikat laufen ab (Samsung-Zertifikate ca. 1 Jahr); dann Schritt 3/5 wiederholen.

> Der Dateiname der .wgt darf **keine Leerzeichen** enthalten, sonst scheitert die Installation ohne Fehlermeldung (das Build-Skript benennt sie deshalb `WebGamePortsHub.wgt`).
> `<tizen:profile>` muss `tv` heißen (nicht `tv-samsung`).

## Controller koppeln
*Einstellungen → Allgemein → Externe Geräte-Manager → Eingabegeräte-Manager → Bluetooth-Gamepad* (je nach Firmware leicht anders benannt).

## Nicht getestet
Ich konnte die TV-App ohne dein Zertifikat und deinen TV nicht installieren oder starten. Ungeprüft sind insbesondere:
Gamepad-Erkennung im Tizen-Webview, der Aufruf des TV-Browsers (`launchAppControl`) und ob einzelne Spiele-Hosts im TV-Browser laufen.
