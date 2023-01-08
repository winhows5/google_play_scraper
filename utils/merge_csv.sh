# Assume all files have headers. 
# Assume all files are ordered from index 0.

FILE_PATH="App_review/US_review/"
FILE_NAME="COMMUNICATION_US_en"
FILE_PARTITION=2

outfile=$FILE_PATH$FILE_NAME".csv"
infile0=$FILE_PATH$FILE_NAME"_0.csv"
head -n 1 $infile0 > $outfile 

total_num=0
for (( i=0; i<$FILE_PARTITION; ++i ))
do
    infile=$FILE_PATH$FILE_NAME"_"$i".csv"
    num=`wc -l < $infile`
    total_num=$((total_num+num-1))

    echo "Lines in file $i: $num"
    tail -n+2 -q $infile >> $outfile
done

num=`wc -l < $outfile`
echo "Lines sum: $((total_num+1)). Lines in out file: $num"
