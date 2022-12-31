def a(cb):
    cb("foo")

def cb(x):
    print(x)

a(cb)

print(len([1,2,3]))
a = [4,[5,6,7],8,9]
print(len(a[1]))
print(len({'a': 1, 'b': 2}))

x = 1
while x <= 5:
    if x == 3:
        print('elif x is 3')
    elif x == 4:
        print('elif x is 4')
    else:
        print('else x is ' + str(x))
    x = x + 1

for x in [1,2,3]:
    print(x)
    print(x + 1)


x = None
if x:
    print("fail")
else:
    print("pass")

if not x:
    print("pass")
else:
    print("fail")


x = [1,2,3]
y = x.pop()
if len(x) == 2 and x[0] == 1 and x[1] == 2 and y == 3:
    print("pass")
else:
    print("fail")
x.append(4)
if len(x) == 3 and x[0] == 1 and x[1] == 2 and x[2] == 4:
    print("pass")
else:
    print("fail")


getRandomInt = random.randrange

def print_list(list_):
    s = '['
    for element in list_:
        s = s + ' ' + str(element)
    s = s + ' ]'
    print(s)

def shuffle(list_):
    index = len(list_)

    while index != 0:
        rand_index = getRandomInt(0, index - 1)
        index = index - 1
        temp = list_[index]
        list_[index] = list_[rand_index]
        list_[rand_index] = temp

x = [1,2,3,4,5,6,7]
shuffle(x)
print_list(x)
print(str(x[-1]))


playfield = []
row = 0
while row < 20:
    playfield.append([0,0,0,0,0,0,0,0,0,0])
    row = row + 1

print(len(playfield[0]))
