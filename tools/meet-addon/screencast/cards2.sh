set -e
ENC="-r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an"
card(){ ffmpeg -v error -y -loop 1 -t $2 -i cards/card$1.png -vf "scale=1920:1080,setsar=1,fps=30,fade=in:0:9,fade=out:st=$(echo "$2-0.3"|bc):d=0.3" $ENC seg/c$1.mp4; }
card 01 10; card 02 6; card 03 6; card 04 10; card 05 11; card 06 10; card 07 10; card 08 8; card 09 8; card 10 11
printf "file '%s'\n" c01.mp4 c02.mp4 v02t.mp4 c03.mp4 v03t.mp4 c04.mp4 v04t.mp4 v05t.mp4 c05.mp4 c06.mp4 c07.mp4 c08.mp4 v06t.mp4 c09.mp4 v07t.mp4 v08t.mp4 c10.mp4 > seg/list.txt
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy human-shaped-meet-addon-review.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 human-shaped-meet-addon-review.mp4
