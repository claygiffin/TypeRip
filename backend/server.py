import os
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from fontTools.ttLib import TTFont
from io import BytesIO

app = Flask(__name__)
CORS(app)
RENDER_API_KEY = os.getenv("RENDER_API_KEY")
ENV = os.getenv("FLASK_ENV", "production")  # default to production if not set

# Get comma-separated list of allowed origins, defaulting to localhost for dev
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Only allow requests from your frontend
CORS(app, origins=ALLOWED_ORIGINS)


@app.route("/modify-font", methods=["POST"])
def modify_font():
    if ENV == "production" and request.headers.get("x-api-key") != RENDER_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401

    font_file = request.files["font"]
    family_name = request.form.get("familyName", "Modified Family")
    subfamily_name = request.form.get("subfamilyName", "Regular")
    full_name = request.form.get("fullName", f"{family_name} {subfamily_name}")

    font = TTFont(font_file)

    # Edit metadata
    for record in font["name"].names:
        if record.nameID == 1:
            record.string = family_name.encode("utf-16-be")
        elif record.nameID == 2:
            record.string = subfamily_name.encode("utf-16-be")
        elif record.nameID == 3:
            record.string = full_name.encode("utf-16-be")

    output = BytesIO()
    font.save(output)
    output.seek(0)

    return send_file(
        output,
        mimetype="font/ttf",
        as_attachment=True,
        download_name=f"{full_name}.ttf",
    )


@app.route("/ping")
def ping():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5555))
    app.run(debug=False, host="0.0.0.0", port=port)
