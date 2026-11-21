MEHFIL INVITATION — TERMUX AUR WINDOWS

WINDOWS
1. ZIP ko extract karo.
2. Python 3.9 ya newer installed hona chahiye. Python installation mein "Add Python to PATH" select karo.
3. START_WINDOWS.bat par double-click karo.
4. Window mein admin URL aur password dikhega. URL browser mein kholo.
5. Server chalne ke dauran window khuli rakho.

TERMUX
1. ZIP Downloads folder mein rakho.
2. Termux mein yeh commands chalao:

termux-setup-storage
pkg install -y unzip python
mkdir -p ~/Mehfil_Invitation
unzip -o ~/storage/downloads/Mehfil_Invitation_FULL_V2_Fixed.zip -d ~/Mehfil_Invitation
cd ~/Mehfil_Invitation/Mehfil_Termux_Windows
bash START_TERMUX.sh

3. Shuru hone par admin URL aur password screen par dikhenge. Termux session chalta rakho.
4. Dobara start: cd ~/Mehfil_Invitation/Mehfil_Termux_Windows && bash START_TERMUX.sh

ADMIN AUR GUEST
Admin password data/admin-settings.json mein save rehta hai. Is file ko private rakho.
Admin panel se nayi invitation banao aur guest link copy karo. Usi invitation ko edit karoge toh wahi link update hoga.
Guest ko edit access nahi milta. Guest wishes sirf uske apne browser mein save hoti hain.
Same Wi-Fi par sharing ke liye Wi-Fi IP wala URL use karo. Windows firewall poochhe toh private network access allow karo.
Internet/WhatsApp par alag networks se kholne ke liye HTTPS domain aur tunnel ya reverse proxy alag se configure karna hoga. Local IP link internet se nahi khulega.
Backup: poora data folder, khaas taur par invitations.sqlite3 aur admin-settings.json. Backup se pehle server stop karo.
