.PHONY: build run install clean preview

# Build the project for production
build:
	npm run build

# Run the development server
run:
	npm run dev

# Install dependencies
install:
	npm install

# Clean build artifacts
clean:
	rm -rf dist

# Preview the production build
preview:
	npm run preview

