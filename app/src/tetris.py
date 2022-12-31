# Tetris

# window is exposed through ffi
# here we assign the other js globals we need
requestAnimationFrame = window.requestAnimationFrame
cancelAnimationFrame = window.cancelAnimationFrame

# canvas is also exposed through ffi via a React ref
context = canvas.getContext("2d")

print("Press the left and right arrow keys to move the tetrimino.")
print("Press up to rotate.")
print("Hold down to speed up placement.")

# adapted from:
# https://gist.github.com/straker/3c98304f8a6a9174efd8292800891ea1
class Tetris:
    def __init__(self):
        self.tetrominos = []
        self.grid = canvas.height / 22
        self.raf = None
        self.is_game_over = False
        self.count = 0

        self.playfield = []
        row = 0
        while row < 22:
            self.playfield.append([0,0,0,0,0,0,0,0,0,0])
            row = row + 1

        self.tetromino = self.next_tetromino()

    # generate a new tetromino sequence
    def generate_tetrominos(self):
        sequence = ["I", "J", "L", "O", "S", "T", "Z"]
        shuffle(sequence)

        while len(sequence) > 0:
            self.tetrominos.append(sequence.pop())

    def next_tetromino(self):
        if len(self.tetrominos) == 0:
            self.generate_tetrominos()

        name = self.tetrominos.pop()
        matrix = tetrominos[name]

        # I and O start centered, all others start in left-middle
        col = len(self.playfield[0]) / 2 - math.ceil(len(matrix[0]) / 2)

        row = 0
        if name != "I":
            row = 1

        next_tet = {
            "name": name,  # name of the piece (L, O, etc.)
            "matrix": matrix,  # the current rotation matrix
            "row": row,  # current row (starts offscreen)
            "col": col,  # current col
        }
        return next_tet

    # place the tetromino on the playfield
    def place_tetromino(self):
        t = self.tetromino
        row = 0
        while row < len(t["matrix"]):
            col = 0
            while col < len(t["matrix"][row]):
                if t["matrix"][row][col]:
                    # game over if piece has any part offscreen
                    if t["row"] + row - 1 < 0:
                        return self.show_game_over()

                    self.playfield[t["row"] + row][t["col"] + col] = t["name"]

                col = col + 1
            row = row + 1

        # check for line clears starting from the bottom and working our way up
        row = len(self.playfield) - 1
        while row >= 0:
            line_cleared = True
            for cell in self.playfield[row]:
                line_cleared = line_cleared and cell
            if line_cleared:
                # drop every row above this one
                r = row
                while r >= 1:
                    c = 0
                    while c < len(self.playfield[r]):
                        self.playfield[r][c] = self.playfield[r - 1][c]
                        c = c + 1
                    r = r - 1
            else:
                row = row - 1

        self.tetromino = self.next_tetromino()

    # check to see if the new matrix/row/col is valid
    def is_valid_move(self, matrix, cell_row, cell_col):
        row = 0
        while row < len(matrix):
            col = 0
            while col < len(matrix[row]):
                if (matrix[row][col] and (cell_col + col < 0 or cell_col + col >= len(self.playfield[0]) or cell_row + row >= len(self.playfield) or self.playfield[cell_row + row][cell_col + col])):
                    return False
                col = col + 1
            row = row + 1

        return True

    # show the game over screen
    def show_game_over(self):
        cancelAnimationFrame(self.raf)
        self.is_game_over = True

        context.fillStyle = "black"
        context.globalAlpha = 0.75
        context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60)

        context.globalAlpha = 1
        context.fillStyle = "white"
        context.font = "36px monospace"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2)

    # game loop
    def loop(self):
        self.raf = requestAnimationFrame(self.loop)
        self.grid = canvas.height / 22
        offset = (canvas.width / 2) - (self.grid * 5)
        context.fillStyle = "black"
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.fillRect(offset - 1, 0, self.grid * 10 + 1, canvas.height)

        # draw the playfield
        row = 0
        while row < 22:
            col = 0
            while col < 10:
                if self.playfield[row][col]:
                    name = self.playfield[row][col]
                    context.fillStyle = colors[name]
                    # drawing 1 px smaller than the grid creates a grid effect
                    context.fillRect(col * self.grid + offset, row * self.grid, self.grid - 1, self.grid - 1)
                col = col + 1
            row = row + 1
        
        # draw the active tetromino
        if self.tetromino:

            # tetromino falls every 35 frames
            self.count = self.count + 1
            if self.count > 35:
                self.tetromino["row"] = self.tetromino["row"] + 1
                self.count = 0

                # place piece if it runs into anything
                if not self.is_valid_move(self.tetromino["matrix"], self.tetromino["row"], self.tetromino["col"]):
                    self.tetromino["row"] = self.tetromino["row"] - 1
                    self.place_tetromino()

            context.fillStyle = colors[self.tetromino["name"]]

            row = 0
            while row < len(self.tetromino["matrix"]):
                col = 0
                while col < len(self.tetromino["matrix"][row]):
                    if self.tetromino["matrix"][row][col]:
                        # drawing 1 px smaller than the grid creates a grid effect
                        context.fillRect(
                            (self.tetromino["col"] + col) * self.grid + offset,
                            (self.tetromino["row"] + row) * self.grid,
                            self.grid - 1,
                            self.grid - 1,
                        )
                    col = col + 1
                row = row + 1

    # listen to keyboard events to move the active tetromino
    def keydown_listener(self, e):
        if self.is_game_over:
            return

        # left and right arrow keys (move)
        if e.which == 37 or e.which == 39:
            col = self.tetromino["col"] + 1
            if e.which == 37:
                col = self.tetromino["col"] - 1

            if self.is_valid_move(self.tetromino["matrix"], self.tetromino["row"], col):
                self.tetromino["col"] = col

        # up arrow key (rotate)
        if e.which == 38:
            matrix = rotate(self.tetromino["matrix"])
            if self.is_valid_move(matrix, self.tetromino["row"], self.tetromino["col"]):
                self.tetromino["matrix"] = matrix

        # down arrow key (drop)
        if e.which == 40:
            row = self.tetromino["row"] + 1

            if not self.is_valid_move(self.tetromino["matrix"], row, self.tetromino["col"]):
                self.tetromino["row"] = row - 1

                self.place_tetromino()
                return

            self.tetromino["row"] = row


# rotate an NxN matrix 90deg
# @see https://codereview.stackexchange.com/a/186834
def rotate(matrix):
    N = matrix.length - 1
    result = []
    i = 0
    for row in matrix:
        new_row = []
        j = 0
        for val in row:
            new_row.append(matrix[N - j][i])
            j = j + 1
        result.append(new_row)
        i = i + 1
    return result


def shuffle(list_):
    index = len(list_)

    while index != 0:
        rand_index = random.randrange(0, index - 1)
        index = index - 1
        temp = list_[index]
        list_[index] = list_[rand_index]
        list_[rand_index] = temp


# how to draw each tetromino
# @see https://tetris.fandom.com/wiki/SRS
tetrominos = {
    "I": [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    "J": [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    "L": [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
    "O": [
        [1, 1],
        [1, 1],
    ],
    "S": [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    "Z": [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
    "T": [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
}

# color of each tetromino
colors = {
    "I": "cyan",
    "O": "yellow",
    "T": "purple",
    "S": "green",
    "Z": "red",
    "J": "blue",
    "L": "orange",
}

game = Tetris()
document.addEventListener("keydown", game.keydown_listener)
game.raf = requestAnimationFrame(game.loop)
