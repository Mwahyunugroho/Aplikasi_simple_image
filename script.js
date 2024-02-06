document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('gambar');
    const outputCanvas = document.getElementById('outputCanvas');
    const ctx = outputCanvas.getContext('2d');
    const brightnessRange = document.getElementById('brightnessRange');
    const darknessRange = document.getElementById('darknessRange');
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('formatSelect');
    let originalImageData;
    let filters = {
        brightness: 100,
        darkness: 0,
        isGrayscale: false,
    };
    var TxtType = function(el, toRotate, period) {
        this.toRotate = toRotate;
        this.el = el;
        this.loopNum = 0;
        this.period = parseInt(period, 10) || 2000;
        this.txt = '';
        this.tick();
        this.isDeleting = false;
        };
        
        TxtType.prototype.tick = function() {
        var i = this.loopNum % this.toRotate.length;
        var fullTxt = this.toRotate[i];
        
        if (this.isDeleting) {
        this.txt = fullTxt.substring(0, this.txt.length - 1);
        } else {
        this.txt = fullTxt.substring(0, this.txt.length + 1);
        }
        
        this.el.innerHTML = '<span class="wrap">'+this.txt+'</span>';
        
        var that = this;
        var delta = 200 - Math.random() * 100;
        
        if (this.isDeleting) { delta /= 2; }
        
        if (!this.isDeleting && this.txt === fullTxt) {
        delta = this.period;
        this.isDeleting = true;
        } else if (this.isDeleting && this.txt === '') {
        this.isDeleting = false;
        this.loopNum++;
        delta = 500;
        }
        
        setTimeout(function() {
        that.tick();
        }, delta);
        };
        
        window.onload = function() {
        var elements = document.getElementsByClassName('typewrite');
        for (var i=0; i<elements.length; i++) {
        var toRotate = elements[i].getAttribute('data-type');
        var period = elements[i].getAttribute('data-period');
        if (toRotate) {
        new TxtType(elements[i], JSON.parse(toRotate), period);
        }
        }
        // INJECT CSS
        var css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".typewrite > .wrap { border-right: 0.08em solid #fff}";
        document.body.appendChild(css);
        };
    input.addEventListener('change', handleImageUpload);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function () {
                    const maxWidth = 500;
                    const maxHeight = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }

                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }

                    outputCanvas.width = width;
                    outputCanvas.height = height;

                    ctx.drawImage(img, 0, 0, width, height);

                    originalImageData = ctx.getImageData(0, 0, width, height);

                    enableButtons();
                };
            };
            reader.readAsDataURL(file);
        }
    }

    function enableButtons() {
        brightnessRange.disabled = false;
        darknessRange.disabled = false;
        downloadBtn.disabled = false;
        formatSelect.disabled = false;
    }

    function adjustBrightness(value) {
        filters.brightness = value;
        document.getElementById('brightnessValue').innerText = value;
        applyFilter();
    }

    function adjustDarkness(value) {
        filters.darkness = value;
        document.getElementById('darknessValue').innerText = value;
        applyFilter();
    }

    function applyFilter() {
        updateCanvasFilter();
    }

    function updateCanvasFilter() {
        const { brightness, darkness, isGrayscale } = filters;
        outputCanvas.style.filter = `brightness(${brightness}%) contrast(${100 - darkness}%)`;

        if (isGrayscale) {
            outputCanvas.style.filter += ' grayscale(100%)';
        }
    }

    function adjustGrayscale() {
        filters.isGrayscale = !filters.isGrayscale;
        applyFilter();
    }

    function changeOrientation(orientation) {
        outputCanvas.classList.remove('horizontal', 'vertical');
        outputCanvas.classList.toggle(orientation);
    }

    function restartImage() {
        const { width, height } = outputCanvas;
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(originalImageData, 0, 0);
        filters.brightness = 100;
        filters.darkness = 0;
        filters.isGrayscale = false;
        applyFilter();
    }

    function detectEdges() {
        const imageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const grayscaleData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            grayscaleData.data[i] = avg;
            grayscaleData.data[i + 1] = avg;
            grayscaleData.data[i + 2] = avg;
            grayscaleData.data[i + 3] = 255;
        }

        const edgeData = applyEdgeDetection(grayscaleData);
        ctx.putImageData(edgeData, 0, 0);
    }

    function applyEdgeDetection(grayscaleData) {
        const sobelData = new ImageData(grayscaleData.width, grayscaleData.height);
        const sobelMatrixX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        const sobelMatrixY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];

        for (let y = 1; y < grayscaleData.height - 1; y++) {
            for (let x = 1; x < grayscaleData.width - 1; x++) {
                let pixelX = 0;
                let pixelY = 0;

                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        const pixelValue = grayscaleData.data[((y + j - 1) * grayscaleData.width + (x + i - 1)) * 4];
                        pixelX += pixelValue * sobelMatrixX[j][i];
                        pixelY += pixelValue * sobelMatrixY[j][i];
                    }
                }

                const magnitude = Math.sqrt(pixelX ** 2 + pixelY ** 2);
                sobelData.data[(y * grayscaleData.width + x) * 4] = magnitude;
                sobelData.data[(y * grayscaleData.width + x) * 4 + 1] = magnitude;
                sobelData.data[(y * grayscaleData.width + x) * 4 + 2] = magnitude;
                sobelData.data[(y * grayscaleData.width + x) * 4 + 3] = 255;
            }
        }

        return sobelData;
    }

    function adjustGrayscale() {
        filters.isGrayscale = !filters.isGrayscale;
        applyFilter();
    }
    
    function applyFilter() {
        updateCanvasFilter();
        updateCanvasGreyscale();
    }
    
    function updateCanvasGreyscale() {
        const { isGrayscale } = filters;
        if (isGrayscale) {
            const imageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                imageData.data[i] = avg;
                imageData.data[i + 1] = avg;
                imageData.data[i + 2] = avg;
            }
            ctx.putImageData(imageData, 0, 0);
        }
    }
    
    function downloadImage(format) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = outputCanvas.width;
        tempCanvas.height = outputCanvas.height;
    
        // Terapkan orientasi horizontal atau vertikal ke canvas sementara
        if (outputCanvas.classList.contains('horizontal')) {
            tempCtx.translate(tempCanvas.width, 0);
            tempCtx.scale(-1, 1);
        } else if (outputCanvas.classList.contains('vertical')) {
            tempCtx.translate(0, tempCanvas.height);
            tempCtx.scale(1, -1);
        }
    
        // Terapkan filter dan gambar ke canvas sementara
        tempCtx.drawImage(outputCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
        tempCanvas.style.filter = outputCanvas.style.filter;
    
        // Perbarui greyscale jika diterapkan
        if (filters.isGrayscale) {
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                imageData.data[i] = avg;
                imageData.data[i + 1] = avg;
                imageData.data[i + 2] = avg;
            }
            tempCtx.putImageData(imageData, 0, 0);
        }
    
        // Unduh gambar dengan format yang dipilih
        const dataURL = tempCanvas.toDataURL(`image/${format}`);
        const fileName = `processed_image.${format}`;
        
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = fileName;
    
        document.body.appendChild(link);
        link.click();
    
        document.body.removeChild(link);
    }
    
    
    

    document.getElementById('brightnessRange').addEventListener('input', function () {
        adjustBrightness(this.value);
    });

    document.getElementById('darknessRange').addEventListener('input', function () {
        adjustDarkness(this.value);
    });

    document.querySelector('.btn-secondary').addEventListener('click', function () {
        adjustGrayscale();
    });

    document.querySelector('.btn-primary').addEventListener('click', function () {
        changeOrientation('horizontal');
    });

    document.querySelector('.btn-success').addEventListener('click', function () {
        changeOrientation('vertical');
    });

    document.querySelector('.btn-warning').addEventListener('click', function () {
        restartImage();
    });

    document.querySelector('.btn-custom').addEventListener('click', function () {
        detectEdges();
    });

    downloadBtn.addEventListener('click', function () {
        const selectedFormat = formatSelect.value;
        downloadImage(selectedFormat);
    });
});
