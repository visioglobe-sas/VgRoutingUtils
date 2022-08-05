import Proj4js from 'proj4';

class ConvertCoordinates {
    static get DEG2RAD() {
        return Math.PI / 180.0;
    }

    constructor(parameters) {
        this._initializeGeotransform(parameters);
    }

    _initializeGeotransform(parameters) {
        const angle = parameters.geoinformation.rotation_angle_in_degrees * ConvertCoordinates.DEG2RAD;

        this.rotationMatrix = Array.from({length: 4}, (_, i) => 0);
        this.rotationMatrix[0] = Math.cos(angle) * parameters.geoinformation.meters_per_pixel;
        this.rotationMatrix[1] = -Math.sin(angle) * parameters.geoinformation.meters_per_pixel;
        this.rotationMatrix[2] = Math.sin(angle) * parameters.geoinformation.meters_per_pixel;
        this.rotationMatrix[3] = Math.cos(angle) * parameters.geoinformation.meters_per_pixel;

        this.svgHalfHeight = parseFloat(parameters.svgHeight) / 2;

        this.projSrc = new Proj4js.Proj('WGS84');
        this.projDst = new Proj4js.Proj(parameters.proj4string);
        this.offset = {
            x: parseFloat(parameters.offsetX) || 0,
            y: parseFloat(parameters.offsetY) || 0
        };
    }

    _convertSVGToUTM(point) {
        const x = point.x - this.svgHalfHeight;
        const y = this.svgHalfHeight - point.y;
        const result = {
            x: x * this.rotationMatrix[0] + y * this.rotationMatrix[1],
            y: x * this.rotationMatrix[2] + y * this.rotationMatrix[3]
        };
        if (point.z!==undefined)
        {
            result.z = point.z;
        }
        return result;
    }

    convertToLonLat(point) {
        // Convert this point to UTM coordinates
        const pointUTM = this._convertSVGToUTM(point);

        // Offset the point
        // Proj4js.toPoint takes an array of 2/3 elements, or string with 2 or 3 floats
        const offsetedPoint = new Proj4js.toPoint([
            pointUTM.x + this.offset.x,
            pointUTM.y + this.offset.y,
            point.z || 0
        ]);

        // Convert UTM point to WGS84 point
        const pointDest = Proj4js.transform(this.projDst, this.projSrc, offsetedPoint);
        return { lat: pointDest.y, lon: pointDest.x };
    }
}

// The 'node' information is retrieved from the 'routing.json' file.
const node = {
    x: 1000.2808585385311,
    y: 1336.2973624305
};
// The 'parameters' information is retrieved from the 'routing.json' file.
const parameters = {
    svgHeight: "2048",
    offsetX: 495629.54234647355,
    offsetY: 4964404.117186265,
    geoinformation: {
        rotation_angle_in_degrees: 0,
        meters_per_pixel: 0.9447470491880007,
        geo_xref: 494662.1213681048,
        geo_yref: 4963436.696207896,
        pixel_xref: 0,
        pixel_yref: 0,
        proj: "utm --zone 15 --north",
        distance_coef: 0.1,
        tileprovider: "google_hybrid",
        nodeWidth: "0.25"
    },
    proj4string: "+proj=utm +zone=15 +ellps=WGS84 +units=m +no_defs"
};

console.log('node', node);

const converter = new ConvertCoordinates(parameters);
const nodeLonLat = converter.convertToLonLat(node);
console.log('nodeLonLat', nodeLonLat);
