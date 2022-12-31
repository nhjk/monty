# prints to the monty console
print("Hello, monty!")

# canvas is exposed as a built-in through ffi, its a reference to the canvas on the right
ctx = canvas.getContext('2d')
ctx.fillStyle = 'rgb(200, 0, 0)'
ctx.fillRect(10, 10, 50, 50)
ctx.fillStyle = 'rgba(0, 0, 200, 0.5)'
ctx.fillRect(30, 30, 50, 50)

# window is also exposed as a built-in...
# it can be used to get access to *any* js/browser object
console = window.console
console.log("Hello, browser console!") # prints to the browser console
