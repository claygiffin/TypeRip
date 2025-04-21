from flask import Flask, request, send_file
from flask_cors import CORS
from fontTools.ttLib import TTFont
from io import BytesIO

app = Flask(__name__)
CORS(app)

@app.route('/modify-font', methods=['POST'])
def modify_font():
    font_file = request.files['font']
    family_name = request.form.get('familyName', 'Modified Family')
    subfamily_name = request.form.get('subfamilyName', 'Regular')
    full_name = request.form.get('fullName', f"{family_name} {subfamily_name}")

    font = TTFont(font_file)

    # Edit metadata
    for record in font["name"].names:
        if record.nameID == 1:
            record.string = family_name.encode('utf-16-be')
        elif record.nameID == 2:
            record.string = subfamily_name.encode('utf-16-be')
        elif record.nameID == 3:
            record.string = full_name.encode('utf-16-be')

    output = BytesIO()
    font.save(output)
    output.seek(0)

    return send_file(output, mimetype='font/ttf', as_attachment=True,
                     download_name=f'{full_name}.ttf')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
