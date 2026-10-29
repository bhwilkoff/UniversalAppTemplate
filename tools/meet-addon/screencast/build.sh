set -e
C=cards; K=clips; O=seg
ENC="-r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an"
FIT="scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111111,setsar=1,fps=30"
card(){ ffmpeg -v error -y -loop 1 -t $2 -i $C/card$1.png -vf "scale=1920:1080,setsar=1,fps=30,fade=in:0:9,fade=out:st=$(echo "$2-0.3"|bc):d=0.3" $ENC $O/c$1.mp4; }
WIN="crop=2894:1551:130:205"
card 01 11; card 02 7; card 03 7; card 04 11; card 05 12; card 06 11; card 07 11; card 08 10; card 09 10; card 10 12
ffmpeg -v error -y -ss 1 -t 20 -i $K/s02-scopes.mp4 -vf "$WIN,$FIT" $ENC $O/v02.mp4
ffmpeg -v error -y -ss 9 -t 7 -i $K/s06-signin.mp4 -vf "split[a][b];[b]crop=740:330:2250:1250,boxblur=30:3[bl];[a][bl]overlay=2250:1250:enable='gte(t,6.4)',$WIN,$FIT" $ENC $O/v03.mp4
ffmpeg -v error -y -ss 16 -i $K/s06-signin.mp4 -vf "split[a][b];[b]crop=740:330:2250:1250,boxblur=30:3[bl];[a][bl]overlay=2250:1250:enable='lt(t,18.6)',$WIN,$FIT" $ENC $O/v04.mp4
ffmpeg -v error -y -i $K/s07-consent.mp4 -frames:v 1 $O/consent.png
ffmpeg -v error -y -loop 1 -t 7 -i $O/consent.png -i $K/s07-consent.mp4 -filter_complex "[0]crop=1180:1150:0:0,$FIT[a];[1]crop=1180:1150:0:0,$FIT[b];[a][b]concat=n=2:v=1" $ENC $O/v05.mp4
ffmpeg -v error -y -ss 40 -t 150 -i $K/s05-session.mp4 -vf "$WIN,$FIT" $ENC $O/v06.mp4
ffmpeg -v error -y -ss 1 -t 18 -i $K/s09-account.mp4 -vf "split[a][b];[b]crop=480:1300:112:330,boxblur=40:3[bl];[a][bl]overlay=112:330,crop=2894:1425:130:205,$FIT" $ENC $O/v07.mp4
ffmpeg -v error -y -ss 1 -i $K/s10-signout.mp4 -vf "split[a][b];[b]crop=740:330:2250:1250,boxblur=30:3[bl];[a][bl]overlay=2250:1250:enable='gte(t,13.5)',$WIN,$FIT" $ENC $O/v08.mp4
printf "file '%s'\n" c01.mp4 c02.mp4 v02.mp4 c03.mp4 v03.mp4 c04.mp4 v04.mp4 v05.mp4 c05.mp4 c06.mp4 c07.mp4 c08.mp4 v06.mp4 c09.mp4 v07.mp4 v08.mp4 c10.mp4 > $O/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $O/list.txt -c copy human-shaped-meet-addon-review.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 human-shaped-meet-addon-review.mp4
