import 'dart:convert';

import 'package:http/http.dart' as http;

class Category {
  const Category({required this.id, required this.name});

  final int id;
  final String name;
}

class Food {
  const Food({required this.id, required this.name, this.unit});

  final int id;
  final String name;
  final String? unit;
}

abstract class CatalogApi {
  Future<List<Category>> categories();
  Future<List<Food>> foods({int? categoryId});
}

class HttpCatalogApi implements CatalogApi {
  HttpCatalogApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// 로컬 백엔드로 돌리려면 --dart-define=API_BASE_URL=http://10.0.2.2:8000
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cloverky.cloud',
  );

  Future<List<dynamic>> _getList(Uri uri) async {
    final response = await _client.get(uri);
    return jsonDecode(response.body) as List<dynamic>;
  }

  @override
  Future<List<Category>> categories() async {
    final rows = await _getList(
      Uri.parse('$_baseUrl/api/fridge/category/list'),
    );
    return rows.map((row) {
      final map = row as Map<String, dynamic>;
      return Category(id: map['id'] as int, name: map['name'] as String);
    }).toList();
  }

  @override
  Future<List<Food>> foods({int? categoryId}) async {
    final uri = Uri.parse('$_baseUrl/api/fridge/food/catalog').replace(
      queryParameters: categoryId == null
          ? null
          : {'category_id': '$categoryId'},
    );
    final rows = await _getList(uri);
    return rows.map((row) {
      final map = row as Map<String, dynamic>;
      return Food(
        id: map['id'] as int,
        name: map['name'] as String,
        unit: map['default_unit'] as String?,
      );
    }).toList();
  }
}
